# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import contextlib
import os

# Override region to us-central1 if Cloud Run forces us-east1 (which does not support Gemini predictions)
if os.environ.get("GOOGLE_CLOUD_LOCATION") == "us-east1":
    os.environ["GOOGLE_CLOUD_LOCATION"] = "us-central1"

from collections.abc import AsyncIterator

import google.auth
from a2a.server.tasks import InMemoryTaskStore
from dotenv import load_dotenv
from fastapi import FastAPI
from google.adk.cli.fast_api import get_fast_api_app
from google.adk.runners import Runner
from google.cloud import logging as google_cloud_logging

from app.app_utils import services
from app.app_utils.a2a import attach_a2a_routes
from app.app_utils.telemetry import setup_telemetry
from app.app_utils.typing import Feedback

load_dotenv()
setup_telemetry()
_, project_id = google.auth.default()
logging_client = google_cloud_logging.Client()
logger = logging_client.logger(__name__)
allow_origins = (
    os.getenv("ALLOW_ORIGINS", "").split(",") if os.getenv("ALLOW_ORIGINS") else None
)

AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    from app.agent import app as adk_app
    from app.agent import root_agent

    runner = Runner(
        app=adk_app,
        session_service=services.get_session_service(),
        artifact_service=services.get_artifact_service(),
        auto_create_session=True,
    )
    app.state.runner = runner
    app.state.agent_app_name = adk_app.name
    await attach_a2a_routes(
        app,
        agent=root_agent,
        runner=runner,
        task_store=InMemoryTaskStore(),
        rpc_path=f"/a2a/{adk_app.name}",
    )
    yield


app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    web=False,
    artifact_service_uri=services.ARTIFACT_SERVICE_URI,
    allow_origins=allow_origins,
    session_service_uri=services.SESSION_SERVICE_URI,
    otel_to_cloud=False,
    lifespan=lifespan,
)
app.title = "wearedata"
app.description = "API for interacting with the Agent wearedata"


@app.post("/feedback")
def collect_feedback(feedback: Feedback) -> dict[str, str]:
    """Collect and log feedback.

    Args:
        feedback: The feedback data to log

    Returns:
        Success message
    """
    logger.log_struct(feedback.model_dump(), severity="INFO")
    return {"status": "success"}


from pydantic import BaseModel
import time
from fastapi import HTTPException
from google.adk.events.event import Event

class RescanRequest(BaseModel):
    appName: str
    userId: str
    sessionId: str

RESCAN_TIMESTAMPS = {}
RESCAN_LIMIT_SECONDS = 15

@app.post("/rescan", response_model_exclude_none=True)
async def rescan_endpoint(req: RescanRequest) -> list[Event]:
    current_time = time.time()
    last_rescan = RESCAN_TIMESTAMPS.get(req.sessionId, 0)
    if current_time - last_rescan < RESCAN_LIMIT_SECONDS:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Please wait {int(RESCAN_LIMIT_SECONDS - (current_time - last_rescan))} seconds before rescanning."
        )
    
    runner = app.state.runner
    session = await runner.session_service.get_session(
        app_name=req.appName,
        user_id=req.userId,
        session_id=req.sessionId,
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    input_text = session.state.get("input_text", "")
    if not input_text:
        input_text = session.state.get("service_name", "")
        
    keys_to_clear = [
        "data_collection_result",
        "consent_result",
        "youth_safety_result",
        "algorithmic_bias_result",
        "mental_health_result",
        "policy_text",
        "last_scanned_at",
        "scan_status"
    ]
    # Delete the old session to completely wipe its cache
    await runner.session_service.delete_session(
        app_name=req.appName, user_id=req.userId, session_id=req.sessionId
    )
    # Re-create it fresh
    await runner.session_service.create_session(
        app_name=req.appName, user_id=req.userId, session_id=req.sessionId
    )
    
    RESCAN_TIMESTAMPS[req.sessionId] = current_time
    
    from google.adk.types import Content, Part
    from contextlib import aclosing
    
    try:
        events = []
        async with aclosing(
            runner.run_async(
                user_id=req.userId,
                session_id=req.sessionId,
                new_message=Content(role="user", parts=[Part(text=input_text)]),
            )
        ) as agen:
            async for event in agen:
                events.append(event)
        return events
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rescan execution failed: {str(e)}")


from fastapi.staticfiles import StaticFiles

# Serve frontend web app UI
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")


# Main execution
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

