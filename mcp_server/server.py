import json
import os
import re
import httpx
from bs4 import BeautifulSoup
from mcp.server.fastmcp import FastMCP

# Initialize FastMCP Server
mcp = FastMCP("WeAreData-Ethical-Analyzer")

# Paths to knowledge bases
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
REGULATIONS_PATH = os.path.join(CURRENT_DIR, "knowledge", "regulations.json")
DARK_PATTERNS_PATH = os.path.join(CURRENT_DIR, "knowledge", "dark_patterns.json")

# Load Regulations
def load_regulations():
    try:
        with open(REGULATIONS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

# Load Dark Patterns
def load_dark_patterns():
    try:
        with open(DARK_PATTERNS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"patterns": []}

@mcp.tool()
async def fetch_public_policy(url: str) -> dict:
    """Anonymously fetches a public web page (e.g., Privacy Policy, Terms of Service)
    and extracts clean text content by stripping HTML boilerplate.

    Args:
        url: The absolute HTTP/HTTPS URL of the policy page.

    Returns:
        A dictionary containing the status and cleaned text content or error message.
    """
    if not (url.startswith("http://") or url.startswith("https://")):
        return {"status": "error", "message": "Invalid URL protocol. Must start with http:// or https://"}

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {
                    "status": "error",
                    "message": f"Failed to fetch URL. HTTP status code: {response.status_code}"
                }

            # Parse and clean HTML content
            soup = BeautifulSoup(response.text, "html.parser")

            # Remove scripts, styles, headers, footers, navs, and sidebars to get the core text content
            for element in soup(["script", "style", "nav", "footer", "header", "iframe", "aside"]):
                element.decompose()

            # Extract text
            text = soup.get_text(separator="\n")
            
            # Clean up whitespace and collapse multiple empty lines
            lines = [line.strip() for line in text.splitlines()]
            clean_lines = [line for line in lines if line]
            clean_text = "\n".join(clean_lines)

            # Limit size to prevent token blowing (up to 40,000 chars is usually enough for key terms)
            max_chars = 40000
            truncated = len(clean_text) > max_chars
            if truncated:
                clean_text = clean_text[:max_chars] + "\n\n[Content truncated by WeAreData for length...]"

            return {
                "status": "success",
                "content": clean_text,
                "truncated": truncated,
                "length": len(clean_text)
            }

    except Exception as e:
        return {"status": "error", "message": f"An error occurred while fetching: {str(e)}"}


@mcp.tool()
def lookup_regulation(framework: str, section: str = "") -> dict:
    """Looks up summaries of privacy regulations (GDPR, COPPA, CCPA) to ground ethical analysis.

    Args:
        framework: The regulatory framework name ("GDPR", "COPPA", or "CCPA").
        section: Optional specific section/article identifier (e.g. "Article_7", "Section_312.3").
                 If left blank, returns all sections for that framework.

    Returns:
        A dictionary containing titles and summaries of the requested regulation.
    """
    regs = load_regulations()
    fw_key = framework.upper().strip()
    
    if fw_key not in regs:
        return {"status": "error", "message": f"Framework '{framework}' not found. Supported: GDPR, COPPA, CCPA."}

    fw_data = regs[fw_key]

    if not section:
        return {"status": "success", "framework": fw_key, "data": fw_data}

    # Normalize section lookup key
    norm_section = section.strip().replace(" ", "_")
    
    # Try direct match or prefix match
    matches = {}
    for key, value in fw_data.items():
        if norm_section.lower() in key.lower():
            matches[key] = value

    if not matches:
        return {
            "status": "error",
            "message": f"Section '{section}' not found in framework {fw_key}. Available: {list(fw_data.keys())}"
        }

    return {"status": "success", "framework": fw_key, "matches": matches}


@mcp.tool()
def check_known_patterns(text: str) -> dict:
    """Scans privacy policy text or service descriptions for keywords associated with known
    dark patterns, aggressive data collection, or other ethical risks.

    Args:
        text: The text to scan.

    Returns:
        A dictionary listing matches and their corresponding ethical concerns.
    """
    dark_patterns = load_dark_patterns()
    matches = []

    # Simple scan
    text_lower = text.lower()
    for p in dark_patterns.get("patterns", []):
        matched_keywords = []
        for kw in p.get("keywords", []):
            # Using regex boundary checking where appropriate or simple inclusion
            if kw.lower() in text_lower:
                matched_keywords.append(kw)

        if matched_keywords:
            matches.append({
                "pattern_name": p["pattern_name"],
                "matched_keywords": matched_keywords,
                "ethical_concern": p["ethical_concern"]
            })

    return {
        "status": "success",
        "matches_found": len(matches),
        "matches": matches
    }


@mcp.tool()
def generate_report(
    service_name: str,
    domain_scores: dict,
    justifications: dict,
    mitigations: dict
) -> str:
    """Formats the final analysis results into a clean, markdown report with a structured progressive disclosure layout.

    Args:
        service_name: Name of the service analyzed (e.g. "TikTok").
        domain_scores: Dict mapping domains to scores ("RED", "YELLOW", "GREEN").
        justifications: Dict mapping domains to their brief justifications.
        mitigations: Dict mapping domains to their list of actionable mitigations.

    Returns:
        A markdown-formatted string representing the final user report.
    """
    emoji_map = {
        "RED": "🔴 RED (High Risk)",
        "YELLOW": "🟡 YELLOW (Medium Risk)",
        "GREEN": "🟢 GREEN (Low/No Risk)"
    }

    # Compute overall status based on count of red/yellow
    scores = list(domain_scores.values())
    if scores.count("RED") >= 2:
        overall_status = "🔴 HIGH RISK PROFILE"
        overall_color = "RED"
    elif scores.count("RED") == 1 or scores.count("YELLOW") >= 2:
        overall_status = "🟡 MEDIUM RISK PROFILE"
        overall_color = "YELLOW"
    else:
        overall_status = "🟢 LOW RISK PROFILE"
        overall_color = "GREEN"

    report = []
    report.append(f"# WeAreData Ethical Tech Report: {service_name}\n")
    report.append(f"## Overall Assessment: {overall_status}\n")
    report.append("---")
    report.append("### 🚦 Ethics Dashboard (Traffic-Light Scores)")
    report.append("Click on any section to expand details and mitigations.\n")

    domains_friendly = {
        "data_collection": "Data Collection & Sharing",
        "consent": "Consent & Transparency",
        "youth_safety": "Youth Safety (COPPA)",
        "algorithmic_bias": "Algorithmic Bias",
        "mental_health": "Mental Health Impact"
    }

    for key, friendly_name in domains_friendly.items():
        score = domain_scores.get(key, "GREEN")
        score_display = emoji_map.get(score, score)
        justification = justifications.get(key, "No significant concerns identified.")
        mitigation_list = mitigations.get(key, ["No action required."])

        report.append(f"#### [{score_display}] {friendly_name}")
        report.append("<details>")
        report.append(f"<summary>🔍 Click to view analysis & mitigations</summary>\n")
        report.append(f"**Justification:**  \n{justification}\n")
        report.append("**Actionable Mitigations:**")
        for m in mitigation_list:
            report.append(f"- {m}")
        report.append("</details>\n")
        report.append("---")

    report.append("\n*Disclaimer: This analysis is generated by AI agents using WeAreData ethics frameworks and public terms. It does not constitute legal counsel.*")
    
    return "\n".join(report)

if __name__ == "__main__":
    mcp.run()
