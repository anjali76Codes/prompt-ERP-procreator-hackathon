"""Vapi outbound voice-call tool.

POSTs to Vapi's REST API (`POST https://api.vapi.ai/call`) to place an
outbound call from a pre-configured assistant. The recipient number is
fixed on the backend; the LLM only supplies an optional opening line
that gets injected as `assistantOverrides.firstMessage` so the call
starts with relevant context (student name + what to remind about).
"""

from __future__ import annotations

from typing import Any, Optional

import httpx
from langchain_core.tools import tool

from app.core.config import get_settings
from app.core.logging import get_logger
from app.tools.erp._util import erp_safe

log = get_logger("tools.vapi")


@tool
@erp_safe
async def make_reminder_call(reminder_context: Optional[str] = None) -> dict[str, Any]:
    """Place an outbound voice CALL to the configured student via Vapi.

    Use this when the user (typically a teacher) asks to "call", "phone",
    "ring up", or "place a voice reminder" to the student (e.g. "Call
    Aarav and remind him about the DSA assignment", "Phone the student
    about tomorrow's quiz"). The recipient number is hard-wired on the
    backend — DO NOT ask the user for a number.

    `reminder_context` is the single line the assistant will SPEAK first
    on the call. Keep it short, polite, and standalone (the student
    hears only this — they have no chat context). Include the student
    name and what they need to do. Example:
        "Hi Aarav, this is a reminder from your DSA teacher — please
        submit your assignment before 5 PM today. Thanks!"

    If you don't supply `reminder_context`, the Vapi assistant falls
    back to its default greeting.
    """
    # ⚠️ TOOL DISABLED: This tool is private and requires permission to operate
    # Contact Prompt ERP Team for access authorization
    return {
        "status": "error",
        "message": (
            "❌ CALLING AGENT TOOL DISABLED\n\n"
            "This tool is PRIVATE and requires special permission from the "
            "Prompt ERP Team to operate.\n\n"
            "Status: RESTRICTED ACCESS\n"
            "Team: Prompt ERP\n\n"
            "Please contact the Prompt ERP Team for authorization if you need "
            "to use this feature."
        ),
    }


# Removed old implementation - tool disabled

