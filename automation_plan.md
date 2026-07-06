# WeAreData — Task Automation Plan

This document outlines how to transform **WeAreData** from a passive analysis dashboard into an active automation utility. By equipping our agents with execution tools, they can directly mitigate privacy risks instead of just advising the user on how to do so.

---

## 🤖 1. The Automation Spectrum

We can implement automation across three levels of complexity:

```
┌────────────────────────────────────────────────────────┐
│ LEVEL 1: Configuration Generation                      │
│ (Generates custom adblock lists, DNS profiles, configs)│
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ LEVEL 2: Direct Legal Request Sending                  │
│ (Drafts and sends GDPR Erasure / CCPA Opt-Out emails)   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ LEVEL 3: Browser Interaction Automation                │
│ (Navigates opt-out pages & fills forms via Playwright) │
└────────────────────────────────────────────────────────┘
```

---

## 🛠️ 2. Concrete Implementation Vectors

### Vector A: Browser Automation (Form Submission & Opt-Outs)
Instead of telling the user "go to settings and opt-out," the agent navigates the roach-motel opt-out paths.
* **Mechanism**: Use browser automation (like Playwright or Puppeteer) run by a specialized `MitigationAgent`.
* **Execution**:
  1. The user inputs their email/username.
  2. The agent fetches the opt-out URL from its regulations database.
  3. The agent spawns a headless browser, locates the opt-out forms, inputs the user's details, handles confirmation screens, and reports the success back to the user.
* **MCP Integration**: An `Automation-MCP-Server` exposing Playwright actions (`click`, `fill`, `navigate`).

### Vector B: Customized Security Config Generation
The agent translates identified risks into direct machine-readable blocking rules.
* **Mechanism**: Generate custom blocklists based on identified trackers in the policy.
* **Execution**:
  1. If `DataSpy` flags third-party marketing domains, the agent compiles a customized rules list.
  2. **Formats generated**:
     * **uBlock Origin** custom rules (importable text).
     * **Pi-hole / AdGuard Home** DNS block lists.
     * **hosts** file snippets for Windows/macOS.
  3. The user downloads the generated config and imports it with one click.

### Vector C: Automated Legal Communications (GDPR / CCPA)
Directly submit requests to delete account data or opt-out of data sale.
* **Mechanism**: Email API integrations or legal request templates.
* **Execution**:
  1. Locate the privacy email address (e.g., `privacy@tiktok.com`) during fetching.
  2. Draft an exact legally grounded request (GDPR Article 17 Right to Erasure, CCPA Right to Opt-Out).
  3. The agent sends the email automatically on behalf of the user (e.g. using a SendGrid API or local mailto client links).

---

## 🔌 3. Designing the Automation MCP Server

To implement these features, we can create a new MCP server `mcp_automation/server.py` exposing:

```python
@mcp.tool()
async def submit_opt_out(service: str, user_email: str) -> dict:
    """Uses automated browser tools to navigate to a service's opt-out page
    and submit an opt-out request for the user's email."""
    # Playwright automation scripts per service
    ...

@mcp.tool()
def generate_adblock_rules(tracker_domains: list[str]) -> str:
    """Generates a standard uBlock Origin custom filter block list."""
    return "\n".join([f"||{domain}^$third-party" for domain in tracker_domains])

@mcp.tool()
def draft_legal_request(framework: str, service_name: str, privacy_email: str, user_name: str) -> dict:
    """Drafts a legal GDPR deletion or CCPA opt-out email."""
    ...
```

---

## 🚦 4. Safety & Security Guardrails

When agents take action, safety becomes critical:
1. **Verifiable Confirmation**: Tools like `submit_opt_out` must be marked with `require_confirmation=True` in ADK, requiring the user to explicitly click "Approve Action" in the UI before execution.
2. **Credential Sanitization**: The agent must never store user emails, usernames, or passwords. Browser sessions must run statelessly.
3. **Dry Runs**: The agent should present a simulation of the browser automation steps (or show the draft) before taking the action.
