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

from typing import List, Literal
from pydantic import BaseModel, Field

from google.adk.agents import Agent, SequentialAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types

from .tools import fetch_and_store_policy, build_and_generate_report

# 1. Initialize State Callback
async def init_state(callback_context: CallbackContext) -> None:
    """Ensures state keys are initialized to avoid dynamic formatting errors."""
    if "policy_text" not in callback_context.state:
        callback_context.state["policy_text"] = ""
    if "dark_patterns_found" not in callback_context.state:
        callback_context.state["dark_patterns_found"] = "None identified."
    if "service_name" not in callback_context.state:
        callback_context.state["service_name"] = "Technology Service"

# 2. Pydantic schema for domain assessments
class DomainAssessment(BaseModel):
    score: Literal["RED", "YELLOW", "GREEN"] = Field(description="The risk rating for this domain.")
    justification: str = Field(description="A brief justification (under 3 sentences) explaining the rating.")
    mitigations: List[str] = Field(description="2-3 actionable, realistic mitigations for the user.")
    evidence: List[str] = Field(description="Direct quote snippets or identified clauses from the policy text that ground this assessment. Return empty if no concern.")

# 3. Define Input Processor Agent
input_processor = Agent(
    name="input_processor",
    model=Gemini(
        model="gemini-2.5-flash",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction="""Analyze the user message. Call the fetch_and_store_policy tool with the exact URL or text they provided.
If the tool executes successfully, return a message stating that the content has been ingested and scanned.
If the user did not provide a URL or policy text, politely request them to provide one.""",
    tools=[fetch_and_store_policy, build_and_generate_report],
    before_agent_callback=init_state,
)

# 4. Define Domain Sub-Agents
data_spy = Agent(
    name="data_spy",
    model=Gemini(
        model="gemini-2.5-flash",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction="""You are the Data Collection & Sharing ethics analyst for WeAreData.
Analyze the following policy text:
---
{policy_text}
---
Check these matches of known dark/data patterns:
{dark_patterns_found}

Assess:
- What data is collected (device identifiers, location, biometrics, contacts, etc.).
- How it is collected (cookies, trackers, background sync, silent permissions).
- Who it is shared or sold to (third-party advertisers, data brokers, business partners).

Determine a risk rating: RED (high risk / sells personal data / intrusive tracker), YELLOW (medium risk / opt-outs available but defaulted in), or GREEN (low risk / data minimization / clear options).
Provide a brief justification under 3 sentences and suggest 2-3 realistic mitigations (e.g. settings, alternate tools).
Return the structured response matching the output schema.
""",
    output_schema=DomainAssessment,
    output_key="data_collection_result",
)

consent_watch = Agent(
    name="consent_watch",
    model=Gemini(
        model="gemini-2.5-flash",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction="""You are the Consent & Transparency analyst for WeAreData.
Analyze the following policy text:
---
{policy_text}
---
Check these matches of known dark/data patterns:
{dark_patterns_found}

Assess:
- Dark patterns (implied consent, pre-checked opt-ins, misdirection).
- Transparency (buried settings, complex legal jargon, difficult cancellation).

Determine a risk rating: RED (severe dark patterns / roach motel opt-outs), YELLOW (opt-outs are buried or hard to find), or GREEN (clear, simple language / active opt-in).
Provide a brief justification under 3 sentences and suggest 2-3 realistic mitigations.
Return the structured response matching the output schema.
""",
    output_schema=DomainAssessment,
    output_key="consent_result",
)

youth_guard = Agent(
    name="youth_guard",
    model=Gemini(
        model="gemini-2.5-flash",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction="""You are the Youth Safety analyst for WeAreData.
Analyze the following policy text:
---
{policy_text}
---

Assess:
- Safety controls and features targeting children or minors.
- COPPA compliance (verifiable parental consent, age gates).
- Privacy protection of younger users.

Determine a risk rating: RED (explicitly targets minors without real verification / shares minor data), YELLOW (broad age gate but lacks parental verification checks), or GREEN (explicitly COPPA compliant / strong child data protections / no data sharing for minors).
Provide a brief justification under 3 sentences and suggest 2-3 realistic mitigations.
Return the structured response matching the output schema.
""",
    output_schema=DomainAssessment,
    output_key="youth_safety_result",
)

bias_detect = Agent(
    name="bias_detect",
    model=Gemini(
        model="gemini-2.5-flash",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction="""You are the Algorithmic Bias analyst for WeAreData.
Analyze the following policy text:
---
{policy_text}
---

Assess:
- Profiling and targeting systems.
- Risk of discriminatory content delivery or ad targeting.
- Filter bubble amplification.

Determine a risk rating: RED (intrusive tracking-based profiling / discriminative exclusions), YELLOW (uses recommendation algorithm with some user controls), or GREEN (transparency in algorithms / allows disabling personalization / minimal profiling).
Provide a brief justification under 3 sentences and suggest 2-3 realistic mitigations.
Return the structured response matching the output schema.
""",
    output_schema=DomainAssessment,
    output_key="algorithmic_bias_result",
)

mind_guard = Agent(
    name="mind_guard",
    model=Gemini(
        model="gemini-2.5-flash",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction="""You are the Mental Health Impact analyst for WeAreData.
Analyze the following policy text or service description:
---
{policy_text}
---
Check these matches of known patterns:
{dark_patterns_found}

Assess:
- Addictive design patterns (infinite scroll, continuous play, aggressive notifications).
- Engagement maximization tactics.

Determine a risk rating: RED (infinite scroll / daily streaks / notifications designed to hook users), YELLOW (notifications and alerts used regularly but can be turned off), or GREEN (time-limit options / default screen-time caps / non-hooking design).
Provide a brief justification under 3 sentences and suggest 2-3 realistic mitigations.
Return the structured response matching the output schema.
""",
    output_schema=DomainAssessment,
    output_key="mental_health_result",
)

# 5. Define Report Builder Agent
report_builder = Agent(
    name="report_builder",
    model=Gemini(
        model="gemini-2.5-flash",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction="""You are the final report builder for WeAreData.
Call the build_and_generate_report tool to compile the domain analysis results from the session state and output the final user report.
You must output ONLY the returned markdown report exactly as generated by the tool.""",
    tools=[fetch_and_store_policy, build_and_generate_report],
)

# 6. Assemble Root Sequential Pipeline Agent
root_agent = SequentialAgent(
    name="wearedata_pipeline",
    sub_agents=[
        input_processor,
        data_spy,
        consent_watch,
        youth_guard,
        bias_detect,
        mind_guard,
        report_builder,
    ],
)

# 7. Expose App
app = App(
    root_agent=root_agent,
    name="app",
)
