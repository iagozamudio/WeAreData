# WeAreData: AI Privacy Policy & Dark Pattern Scanner

WeAreData is an AI-powered agentic system that scans and analyzes privacy policies and terms of service. It evaluates compliance, privacy risk, and user-manipulation tactics across five key domains:
1. **Data Collection & Sharing** (tracking, sharing, and sell practices)
2. **Consent & Transparency** (implied consent, buried settings, opt-out hurdles)
3. **Youth Safety** (COPPA compliance, parental verification, minor protections)
4. **Algorithmic Bias** (profiling, targeted ad exclusions, filter bubbles)
5. **Mental Health Impact** (addictive design, infinite scroll, engagement hooks)

The project includes an agent pipeline built on the **Google Agent Development Kit (ADK)**, a custom **FastAPI** backend, a sleek interactive **Frontend UI**, and a **Model Context Protocol (MCP)** server for local tooling.

> 🚀 **Live Demo:** Access the hosted application directly at **[wearedata-348229435368.us-east1.run.app](https://wearedata-348229435368.us-east1.run.app/)** (no local setup or deployment required!).

---

## 📁 Project Structure

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

> 💡 **Tip:** Use [Antigravity CLI](https://antigravity.google/) for AI-assisted development - project context is pre-configured in `GEMINI.md`.

---

## ⚙️ Requirements

Before you begin, ensure you have:
- **Python 3.11+**
- **uv**: Fast Python package manager - [Install](https://docs.astral.sh/uv/getting-started/installation/)
- **agents-cli**: Google Agents CLI - Install via:
  ```bash
  uv tool install google-agents-cli
  ```
- **Google Cloud SDK**: For deploying to GCP and authentication - [Install](https://cloud.google.com/sdk/docs/install)

---

## 🚀 Quick Start (Local Setup)

> 💡 **Note:** If you only want to use the application, you can visit the **[Live Demo](https://wearedata-348229435368.us-east1.run.app/)** directly. Follow these steps to run a local instance of the application.

### 1. Install Dependencies
Run the following to initialize dependencies and environment:
```bash
uvx google-agents-cli setup
agents-cli install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and configure your Google Cloud project and credentials:
```bash
cp .env.example .env
```

### 3. Run the FastAPI Backend & Frontend UI
Launch the FastAPI server (which hosts the frontend dashboard on port `8000`):
```bash
uv run python -m app.fast_api_app
```
Once running, open your browser and navigate to:
👉 **[http://localhost:8000](http://localhost:8000)**

### 4. Run Playground (CLI-based interaction)
Alternatively, interact with the agent using the `agents-cli` playground:
```bash
agents-cli playground
```

---

## 🛠️ Commands Reference

| Command | Description |
| :--- | :--- |
| `agents-cli install` | Install dependencies using `uv` |
| `agents-cli playground` | Launch local CLI development environment |
| `agents-cli lint` | Run code quality and lint checks |
| `agents-cli eval` | Evaluate agent behavior (generate, grade, analyze, etc.) |
| `uv run pytest tests/unit tests/integration` | Run unit and integration tests |
| `agents-cli deploy` | Deploy the agent API and Web UI to Cloud Run |

### Project Management & Scaffolding

| Command | Description |
| :--- | :--- |
| `agents-cli scaffold enhance` | Set up Terraform infrastructure & CI/CD pipeline scaffolding |
| `agents-cli infra cicd` | Provision the entire CI/CD pipeline and GCP resources |
| `agents-cli scaffold upgrade` | Auto-upgrade the agent framework to the latest version |

---

## ☁️ Deployment (Optional)

> ⚠️ **Note:** Deploying the application is completely optional, as a public hosted version is already provided at **[wearedata-348229435368.us-east1.run.app](https://wearedata-348229435368.us-east1.run.app/)**.

To deploy your own instance of the agent and frontend to Google Cloud Run:
```bash
gcloud config set project <your-project-id>
agents-cli deploy
```

For professional production workloads, run `agents-cli scaffold enhance` to generate Terraform and CI/CD pipelines, then run `agents-cli infra cicd` to deploy.

---

## 📊 Observability & Interoperability

- **Observability**: Built-in OpenTelemetry logging, tracing, and metric collection. Auto-exports traces and logs to Google Cloud Trace, BigQuery, and Cloud Logging.
- **A2A Protocol**: This agent supports the [A2A Protocol](https://a2a-protocol.org/). You can test and inspect interoperability using the [A2A Inspector](https://github.com/a2aproject/a2a-inspector).

