# WeAreData: AI Privacy Policy & Dark Pattern Scanner

**Multi-Agent System for Privacy Compliance & Ethical Tech Auditing**

![Python](https://img.shields.io/badge/python-3.11%2B-blue)
![Track](https://img.shields.io/badge/track-Agents%20for%20Good-brightgreen)
![Live Demo](https://img.shields.io/badge/demo-live-success)
![A2A Protocol](https://img.shields.io/badge/A2A-supported-orange)

- **Author:** Iago Zamudio Troncoso
- **Email:** iagozamudiot@gmail.com
- **Competition/Context:** AI Agents: Intensive Vibe Coding Capstone Project
- **Track:** Agents for Good
- **Date:** July 6th, 2026
- **Version:** Version 1
- **GitHub:** https://github.com/iagozamudio/WeAreData
- **Live Demo:** [wearedata-348229435368.us-east1.run.app](https://wearedata-348229435368.us-east1.run.app/) (no local setup required)

---

## Table of Contents
1. [🧭 Overview](#-overview)
2. [🧩 The Problem](#-the-problem)
3. [✨ Features](#-features)
4. [🤖 Multi-Agent Architecture](#-multi-agent-architecture)
5. [🔄 Workflow Pipeline](#-workflow-pipeline)
6. [🧪 Demo Results](#-demo-results)
7. [📝 Conclusions and Findings](#-conclusions-and-findings)
8. [💡 Recommendations](#-recommendations)
9. [🚀 Getting Started](#-getting-started)
10. [🔧 Technical Implementation](#-technical-implementation)
11. [☁️ Deployment](#-deployment)
12. [📊 Observability & Interoperability](#-observability--interoperability)
13. [📈 Impact](#-impact)
14. [🔗 Appendix](#-appendix)

---

## 🧭 Overview

Privacy agreements and Terms of Service documents have become notoriously long, complex, and legally opaque; designed by legal teams to minimize corporate liability rather than inform users. These agreements average over 10,000 words, and 99% of consumers accept them without reading. Understanding these documents is vital to protecting data privacy, security, mental well-being, and personal agency.

WeAreData is an AI-powered multi-agent system built to close this information gap. Built on the Google Agent Development Kit (ADK), it accepts any service name, URL, or pasted policy text and runs a comprehensive ethical audit across five dimensions, cross-referencing findings against real regulations and generating a human-readable traffic-light dashboard.

**Key Innovation:** a sequential multi-agent pipeline where specialized LLM agents each evaluate one ethical domain (Data Collection, Consent, Youth Safety, Algorithmic Bias, Mental Health), grounded by a local Model Context Protocol (MCP) knowledge base of legal frameworks and known dark-pattern libraries.

**Core Philosophy:** shift the burden of legal interpretation from the consumer to specialized, context-aware AI agents, making digital transparency accessible, instant, and actionable.

> **Note — Privacy by design:** WeAreData is built to be radically ephemeral. Every scan runs in memory and disappears the moment the session ends: there are no accounts, no logs, and no history tied to who searched for what. This is a deliberate trade-off. Without persistent records, we can't offer personalized dashboards, saved scan history, or long-term trend tracking for an individual user. We accept that cost because it's the only way to make a privacy-auditing tool genuinely trustworthy. A tool that lectures companies about data minimization while quietly building its own user profiles would undercut the entire premise of WeAreData. So the app practices what it audits: no data collection, by design, even when it would be convenient not to.

---

## 🧩 The Problem

### Problem Statement

Most people do not read privacy policies or terms of service before using a product. This is not user negligence; it reflects a systemic failure to make informed consent achievable and to cultivate data literacy. Many organizations prioritize data acquisition over accessible information and ethical design, while consumers also need to understand risks like algorithmic bias and social manipulation. Tools that make these documents accessible are both practically useful and essential to building an ethics-first mindset.

### Pain Points
- **Unreadable TOS documents:** length and legalese make it nearly impossible for average users to know what rights they're giving up.
- **Predatory dark patterns:** "implied consent" (agreement assumed just by scrolling) and "buried settings" intentionally manipulate choices.
- **Algorithmic profiling and bias:** data feeds into systems that amplify filter bubbles, drive discriminatory ad exclusions, or target vulnerable groups.
- **Inadequate youth protections:** despite COPPA, many platforms lack real age-gates and quietly harvest minors' data.
- **Addictive product design:** infinite scroll, notification schedules, and streaks are built to maximize engagement at the cost of mental health.

### Target Audience
- **Everyday Consumers:** want a clear, 30-second summary of what a service does with their data and how to protect themselves.
- **Parents & Educators:** need a fast way to assess youth safety risks before kids sign up for an app.
- **Curious Learners:** want to understand data ethics, dark patterns, and algorithmic bias through real-world examples.

---

## ✨ Features

### Core Capabilities
- ✅ **Anonymous public policy scraping** — finds and scrapes the correct privacy policy from the web, stripping HTML boilerplate.
- ✅ **Dark pattern scanning** — checks policy text against a database of known manipulation keywords.
- ✅ **Five-domain traffic-light audit** — RED/YELLOW/GREEN ratings across five areas of concern.
- ✅ **GDPR, CCPA & COPPA grounding** — matches findings to specific regulatory articles.
- ✅ **Actionable mitigations** — 2-3 realistic steps or alternative tools per flagged concern.
- ✅ **Progressive disclosure UI** — expandable analysis drawers with rate-limiting protections.
- ✅ **Built-in rescan** — clears cached session state and re-runs the analysis live.
- ✅ **Exportable to-do list** — mitigations export as `.ics` files or Google Calendar events.
- ✅ **Privacy-first architecture** — no accounts, logins, or tracking cookies; nothing is stored server-side.
- ✅ **Automatic privacy email extraction** — parses policy text for contact addresses (`privacy@`, `dpo@`, `compliance@`) so users know where to send deletion or opt-out requests.
- ✅ **A2A protocol support** — exposes an `/a2a/app` RPC endpoint and agent cards for interoperability.

### Key Differentiators
- **Multi-agent expert consensus:** five independent domain-specialized sub-agents instead of one LLM summarizing everything at once.
- **MCP-powered local knowledge base:** a FastMCP server serves local JSON stores for dark patterns and regulations, reducing hallucinations.
- **Zero-configuration deployment:** packaged with Docker and Terraform for Cloud Run, with built-in OpenTelemetry logging.

---

## 🤖 Multi-Agent Architecture

WeAreData runs a Sequential Agent pipeline via the Google ADK, giving structured, deterministic analysis steps:

```
User input → input_processor (fetch + extract text)
           → FastMCP server (matches regulations.json and dark_patterns.json)
           → sequential analysis (data_spy → consent_watch → youth_guard → bias_detect → mind_guard)
           → report_builder
           → final markdown report
```

<details>
<summary><strong>🔍 Agent-by-agent breakdown (click to expand)</strong></summary>

- **input_processor** — Ingests and validates user input (raw text, URL, or service name). Runs a DuckDuckGo search if only a company name is given, resolves the URL, and downloads/cleans the target HTML policy with BeautifulSoup. Stores `policy_text`, `service_name`, and metadata in session state.
- **data_spy** — Assesses data collection and sharing vectors: tracking pixels, background syncs, silent device-identifier harvesting, location sharing, and third-party data broker sale terms. Outputs a scored `DomainAssessment` with justification and cited evidence.
- **consent_watch** — Audits consent mechanisms and interface structure: implied consent language ("agree by scrolling"), pre-checked opt-ins, buried settings, and how easy account deletion or opt-out is under GDPR Article 7 / CCPA.
- **youth_guard** — Checks COPPA compliance: whether the service targets or accepts users under 13 or minors under 18, presence of verifiable parental consent (VPC) controls, and minor data retention/deletion practices.
- **bias_detect** — Flags algorithmic profiling risk: automated decision-making under GDPR Article 22, use of sensitive attributes (e.g. ZIP code, demographics) for exclusionary ad targeting, and filter-bubble effects from personalization.
- **mind_guard** — Audits addictive design patterns: infinite scroll, daily streaks, push-notification loops, and autoplay, and proposes mitigations like app timers or notification silencers.
- **report_builder** — Pulls all five `DomainAssessment` outputs from session state, computes the overall traffic-light risk profile using domain-score heuristics, and formats everything into a clean markdown report.
- **wearedata_pipeline (Orchestrator)** — A `SequentialAgent` that coordinates execution order across all eight agents, maintains consistent session-state variables between phases, and serves as the entry point the FastAPI backend calls.

</details>

---

## 🔄 Workflow Pipeline

1. **Search & scrape** — `input_processor` searches DuckDuckGo (if given a name) and fetches the target policy page.
2. **Pattern match & enrichment** — the FastMCP server scans for terms like "infinite scroll" or "by continuing to use" and matches GDPR/COPPA articles.
3. **Sequential deep analysis** — each of the five domain agents evaluates the text and produces a RED/YELLOW/GREEN rating.
4. **Summary formulation** — `report_builder` applies a heuristic scoring engine (e.g. two or more RED ratings triggers an overall high-risk profile).
5. **Delivery** — the FastAPI backend serves results to the web UI as an interactive traffic-light drawer.

---

## 🧪 Demo Results

<details open>
<summary><strong>Case A: Predatory Social Platform ("VibeStream") — Overall: 🔴 HIGH RISK</strong></summary>

- **Data Collection & Sharing:** 🔴 RED — collects device IDs, GPS logs, and keystroke patterns; sells to data brokers. *Mitigation:* disable location services, use browser containers.
- **Consent & Transparency:** 🔴 RED — implied consent by continued use; account deletion requires a physical letter. *Mitigation:* use temp accounts, third-party deletion services.
- **Youth Safety:** 🟡 YELLOW — bypassable self-declared age gate; tracks 13+ accounts by default. *Mitigation:* parental controls at the device level.
- **Algorithmic Bias:** 🔴 RED — persistent profiling with no opt-out for targeted ads or recommendations. *Mitigation:* disable personalized ads where possible.
- **Mental Health Impact:** 🔴 RED — infinite scroll, daily streaks, un-silenceable notifications. *Mitigation:* app timers, OS-level notification blocks.

</details>

<details open>
<summary><strong>Case B: Privacy-First Utility ("SecuredNote") — Overall: 🟢 LOW RISK</strong></summary>

- **Data Collection & Sharing:** 🟢 GREEN — data minimization, zero-knowledge encryption, no selling or sharing.
- **Consent & Transparency:** 🟢 GREEN — plain-English terms, active opt-ins, single-click deletion.
- **Youth Safety:** 🟢 GREEN — explicitly COPPA compliant, rejects under-13 users, deletes accidental minor data immediately.
- **Algorithmic Bias:** 🟢 GREEN — no targeted ads; personalization processed on-device.
- **Mental Health Impact:** 🟢 GREEN — chronological feed, no infinite scroll or push loops.

</details>

---

## 📝 Conclusions and Findings

1. **Specialized pipelines beat monolithic prompts** — a single LLM analyzing a 15-page policy for multiple criteria tends to miss sections due to context fatigue; splitting the work across domain agents (`youth_guard`, `mind_guard`, etc.) improves precision and evidence extraction.
2. **Local MCP grounding reduces hallucination** — a local knowledge layer lets agents cite real regulatory articles (e.g. CCPA 1798.120) with high fidelity instead of vague approximations.
3. **Structured JSON output keeps the UI stable** — a Pydantic-based `DomainAssessment` schema guarantees well-formed data, preventing rendering crashes.

---

## 💡 Recommendations

**For tech developers:**
1. Move from implied consent to active, granular opt-ins.
2. Implement GDPR-compliant, single-click account deletion and data export.
3. Let users opt out of recommendation algorithms in favor of a chronological feed.

**For advocacy groups & educators:**
1. Use tools like WeAreData in classrooms and community workshops to teach digital literacy through hands-on examples.
2. Run periodic scans to track how a service's privacy terms change over time, helping communities hold platforms accountable.

---

## 🚀 Getting Started

> 💡 If you only want to use the application, visit the [Live Demo](https://wearedata-348229435368.us-east1.run.app/) directly — no setup required. The steps below are for running or developing a local instance.

### ⚙️ Requirements
- **Python 3.11+**
- **uv** — fast Python package manager ([install](https://docs.astral.sh/uv/getting-started/installation/))
- **agents-cli** — Google Agents CLI, installed via `uv tool install google-agents-cli`
- **Google Cloud SDK** — for deployment and authentication ([install](https://cloud.google.com/sdk/docs/install))

<details>
<summary><strong>📁 Project structure (click to expand)</strong></summary>

```
wearedata/
├── app/                      # Core agent and backend code
│   ├── agent.py              # Multi-agent sequential pipeline logic
│   ├── fast_api_app.py       # FastAPI backend (serves API & mounts frontend)
│   └── app_utils/            # Helper utilities and telemetry setup
├── frontend/                 # Interactive web user interface
│   ├── index.html            # Main dashboard UI
│   ├── app.js / style.css    # UI logic and modern styling
│   └── test-suite.html/.js   # Interactive agent test suite
├── mcp_server/               # Model Context Protocol (MCP) Server
│   ├── server.py             # MCP server implementation
│   └── knowledge/            # Local data/knowledge base for scanner
├── deployment/               # Infrastructure and cloud deployment
│   └── terraform/            # Terraform configurations for GCP
├── tests/                    # Unit, integration, and load tests
├── GEMINI.md                 # AI-assisted development instructions
└── pyproject.toml            # Project dependencies and tool configs
```

> **Tip:** Use [Antigravity CLI](https://antigravity.google/) for AI-assisted development; project context is pre-configured in `GEMINI.md`.

</details>

### 🏁 Quick Start
1. **Install dependencies:**
   ```bash
   uvx google-agents-cli setup
   agents-cli install
   ```
2. **Configure environment variables** — copy `.env.example` to `.env` and set your Google Cloud project and credentials:
   ```bash
   cp .env.example .env
   ```
3. **Run the FastAPI backend & frontend UI** (hosts the dashboard on port `8000`):
   ```bash
   uv run python -m app.fast_api_app
   ```
   Then open [http://localhost:8000](http://localhost:8000).
4. **Run the playground** for CLI-based interaction:
   ```bash
   agents-cli playground
   ```

### 🛠️ Commands Reference

| Command | Description |
| :--- | :--- |
| `agents-cli install` | Install dependencies using `uv` |
| `agents-cli playground` | Launch local CLI development environment |
| `agents-cli lint` | Run code quality and lint checks |
| `agents-cli eval` | Evaluate agent behavior (generate, grade, analyze, etc.) |
| `uv run pytest tests/unit tests/integration` | Run unit and integration tests |
| `agents-cli deploy` | Deploy the agent API and Web UI to Cloud Run |
| `agents-cli scaffold enhance` | Set up Terraform infrastructure & CI/CD pipeline scaffolding |
| `agents-cli infra cicd` | Provision the entire CI/CD pipeline and GCP resources |
| `agents-cli scaffold upgrade` | Auto-upgrade the agent framework to the latest version |

---

## 🔧 Technical Implementation

### Core Technologies
- **Backend:** FastAPI (Python 3.11), async routing, custom endpoints like `/rescan`.
- **Agent Framework:** Google ADK — `Agent`, `SequentialAgent`, and session management.
- **Models:** Gemini 2.5 Flash and Gemini 3.5 Flash for rapid processing.
- **Local Tooling (MCP):** FastMCP server serving `regulations.json` and `dark_patterns.json`.
- **Frontend:** Vanilla HTML5/CSS3 (CSS variables, glassmorphism, responsive grid) and JavaScript.

### Testing & Evaluation Loop
- **Unit & integration testing:** Pytest validates streaming SSE endpoints, agent trace compilation, and A2A connectivity.
- **Evaluation loop:** `agents-cli eval` runs synthesized multi-turn datasets (`tests/eval/datasets/basic-dataset.json`).
- **LLM-as-judge scoring:** a custom evaluator (`tests/eval/metrics.py`) uses a deterministic `gemini-flash-latest` model to grade responses 1-5 against ground-truth references.

---

## ☁️ Deployment

Deploying your own instance is entirely optional; the [Live Demo](https://wearedata-348229435368.us-east1.run.app/) is a fully hosted, public version. To deploy your own copy to Google Cloud Run:
```bash
gcloud config set project <your-project-id>
agents-cli deploy
```
For production workloads, run `agents-cli scaffold enhance` to generate Terraform and CI/CD pipeline scaffolding, then `agents-cli infra cicd` to provision and deploy the full pipeline.

---

## 📊 Observability & Interoperability

- **Observability:** Built-in OpenTelemetry logging, tracing, and metric collection, auto-exporting traces and logs to Google Cloud Trace, BigQuery, and Cloud Logging.
- **A2A Protocol:** The agent supports the [A2A Protocol](https://a2a-protocol.org/), publishing its schema via `/.well-known/agent-card.json` and exposing an `/a2a/app` RPC endpoint. Interoperability can be tested with the [A2A Inspector](https://github.com/a2aproject/a2a-inspector).

---

## 📈 Impact

- **Closing the information gap:** a clear, 30-second traffic-light summary gives everyday people the same insight into their data rights that lawyers and auditors have long had.
- **Protecting vulnerable users:** early flagging of weak age-gates helps parents catch youth safety risks before kids sign up, not after harm occurs.
- **Building everyday data literacy:** every scan doubles as a mini-lesson in recognizing dark patterns, algorithmic bias, and addictive design elsewhere.
- **Lowering the barrier to digital advocacy:** ready-to-send advocacy emails and mitigation checklists turn awareness into action without requiring legal expertise.

---

## 🔗 Appendix

- **GitHub:** [github.com/iagozamudio/WeAreData](https://github.com/iagozamudio/WeAreData)
- **Live Demo:** [wearedata-348229435368.us-east1.run.app](https://wearedata-348229435368.us-east1.run.app/)
- **Contact:** iagozamudiot@gmail.com

## License

This project's license is defined in the [LICENSE](LICENSE) file in the repository.
