import re
import urllib.parse
from urllib.parse import urlparse, parse_qs
import httpx
from bs4 import BeautifulSoup
from google.adk.tools import ToolContext

def extract_url_from_ddg(href: str) -> str:
    """Extracts the actual destination URL from a DuckDuckGo link redirect."""
    try:
        parsed = urlparse(href)
        # Handle cases where href is relative or absolute
        qs = parse_qs(parsed.query)
        if "uddg" in qs:
            return qs["uddg"][0]
    except Exception:
        pass
    return ""

async def search_privacy_policy(service_name: str) -> str:
    """Searches DuckDuckGo anonymously for the privacy policy URL of a service."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    query = f"{service_name} privacy policy"
    search_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(search_url, headers=headers)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, "html.parser")
                # DuckDuckGo HTML search results links have class 'result__url'
                links = soup.find_all("a", class_="result__url")
                for link in links:
                    href = link.get("href", "")
                    target_url = extract_url_from_ddg(href)
                    if target_url and ("privacy" in target_url.lower() or "legal" in target_url.lower() or "terms" in target_url.lower()):
                        return target_url
                # Fallback to the very first result link if no legal keyword matches
                for link in links:
                    target_url = extract_url_from_ddg(link.get("href", ""))
                    if target_url:
                        return target_url
    except Exception as e:
        print(f"Error during DuckDuckGo search: {e}")
    return ""

async def fetch_and_store_policy(input_text: str, tool_context: ToolContext) -> dict:
    """Extracts a URL, searches anonymously for a service name, or stores the input text directly.
    Saves the fetched content and metadata to the session state.

    Args:
        input_text: A URL, a service name (e.g. 'TikTok'), or raw policy text.

    Returns:
        A dictionary with the scan status enum and messages.
    """
    input_text = input_text.strip()
    tool_context.state["input_text"] = input_text
    
    # 1. Check if it's a URL
    url_match = re.match(r'^https?://[^\s]+$', input_text)
    
    # 2. Check if it's pasted document content (longer text blocks or contains multiple newlines)
    is_pasted_text = len(input_text) > 200 or "\n" in input_text

    url = ""
    service_name = ""
    
    if url_match:
        url = url_match.group(0)
        domain = url.split("//")[-1].split("/")[0]
        service_name = domain.replace("www.", "")
    elif is_pasted_text:
        # Save directly
        tool_context.state["policy_text"] = input_text
        tool_context.state["service_name"] = "Submitted Text"
        tool_context.state["scan_status"] = "ok"
        tool_context.state["privacy_email"] = extract_privacy_email(input_text)
        
        # Check for known dark patterns
        from mcp_server.server import check_known_patterns
        patterns_res = check_known_patterns(input_text)
        if patterns_res.get("status") == "success":
            tool_context.state["dark_patterns_found"] = str(patterns_res["matches"])
        else:
            tool_context.state["dark_patterns_found"] = "None identified."
            
        return {
            "status": "ok",
            "message": "Successfully stored and scanned pasted policy text."
        }
    else:
        # Treat as Service Name (e.g. "TikTok")
        service_name = input_text
        # Search DuckDuckGo for the privacy policy URL
        url = await search_privacy_policy(service_name)
        if not url:
            tool_context.state["scan_status"] = "not_found"
            tool_context.state["privacy_email"] = "not_found"
            return {
                "status": "not_found",
                "message": f"Could not automatically locate a privacy policy URL for '{service_name}'."
            }

    # Fetch policy content from resolved URL
    from mcp_server.server import fetch_public_policy, check_known_patterns
    
    fetch_res = await fetch_public_policy(url)
    if fetch_res.get("status") == "success":
        content = fetch_res["content"]
        tool_context.state["policy_text"] = content
        tool_context.state["service_name"] = service_name if service_name else url.split("//")[-1].split("/")[0].replace("www.", "")
        tool_context.state["privacy_email"] = extract_privacy_email(content)
        
        status_state = "partial" if fetch_res.get("truncated") else "ok"
        tool_context.state["scan_status"] = status_state
        
        # Check for known dark patterns
        patterns_res = check_known_patterns(content)
        if patterns_res.get("status") == "success":
            tool_context.state["dark_patterns_found"] = str(patterns_res["matches"])
        else:
            tool_context.state["dark_patterns_found"] = "None identified."
            
        return {
            "status": status_state,
            "message": f"Located and scanned policy for {tool_context.state['service_name']} via {url}.",
            "service_name": tool_context.state["service_name"]
        }
    else:
        tool_context.state["scan_status"] = "error"
        tool_context.state["privacy_email"] = "not_found"
        return {
            "status": "error",
            "message": f"Located policy URL ({url}) but failed to fetch it: {fetch_res.get('message')}"
        }


def extract_privacy_email(text: str) -> str:
    """Regex helper to scan for contact emails inside policy texts."""
    import re
    emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)
    if not emails:
        return "not_found"
    # Filter for privacy-related emails first
    privacy_keywords = ["privacy", "legal", "dpo", "compliance", "support", "contact"]
    for email in emails:
        if any(kw in email.lower() for kw in privacy_keywords):
            return email
    return emails[0]


def build_and_generate_report(tool_context: ToolContext) -> str:
    """Compiles the domain assessments from the session state and formats the final report.

    Returns:
        A markdown-formatted string representing the final user report.
    """
    from mcp_server.server import generate_report
    import datetime

    service_name = tool_context.state.get("service_name", "Technology Service")
    tool_context.state["last_scanned_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
    
    # Extract results from state safely
    def get_fields(result_key):
        res = tool_context.state.get(result_key)
        if not res:
            return "GREEN", "No significant concerns identified.", ["No action required."]
        
        if hasattr(res, "score"):
            return res.score, res.justification, res.mitigations
        elif isinstance(res, dict):
            return res.get("score", "GREEN"), res.get("justification", "No significant concerns."), res.get("mitigations", [])
        return "GREEN", "No significant concerns.", []

    dc_score, dc_just, dc_mit = get_fields("data_collection_result")
    c_score, c_just, c_mit = get_fields("consent_result")
    ys_score, ys_just, ys_mit = get_fields("youth_safety_result")
    ab_score, ab_just, ab_mit = get_fields("algorithmic_bias_result")
    mh_score, mh_just, mh_mit = get_fields("mental_health_result")

    domain_scores = {
        "data_collection": dc_score,
        "consent": c_score,
        "youth_safety": ys_score,
        "algorithmic_bias": ab_score,
        "mental_health": mh_score
    }
    
    justifications = {
        "data_collection": dc_just,
        "consent": c_just,
        "youth_safety": ys_just,
        "algorithmic_bias": ab_just,
        "mental_health": mh_just
    }

    mitigations = {
        "data_collection": dc_mit,
        "consent": c_mit,
        "youth_safety": ys_mit,
        "algorithmic_bias": ab_mit,
        "mental_health": mh_mit
    }

    report = generate_report(
        service_name=service_name,
        domain_scores=domain_scores,
        justifications=justifications,
        mitigations=mitigations
    )
    return report
