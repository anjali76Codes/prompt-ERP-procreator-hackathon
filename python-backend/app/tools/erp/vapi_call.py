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
    settings = get_settings()

    if not (
        settings.vapi_api_key
        and settings.vapi_assistant_id
        and settings.vapi_phone_number_id
    ):
        return {
            "status": "error",
            "message": (
                "Vapi is not fully configured — set VAPI_API_KEY, "
                "VAPI_ASSISTANT_ID, and VAPI_PHONE_NUMBER_ID in the "
                "python-backend .env."
            ),
        }

    payload: dict[str, Any] = {
        "assistantId": settings.vapi_assistant_id,
        "phoneNumberId": settings.vapi_phone_number_id,
        "customer": {"number": settings.vapi_default_to},
    }
    if reminder_context:
        # Overrides only the assistant's opening line; everything else
        # (voice, prompt, end-call logic) stays as configured in Vapi.
        payload["assistantOverrides"] = {"firstMessage": reminder_context}

    url = f"{settings.vapi_base_url.rstrip('/')}/call"
    headers = {
        "Authorization": f"Bearer {settings.vapi_api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(url, headers=headers, json=payload)

    if resp.status_code >= 400:
        log.warning(
            "vapi call rejected",
            status=resp.status_code,
            body=resp.text[:300],
        )
        return {
            "status": "error",
            "message": (
                f"Vapi rejected the call (HTTP {resp.status_code}). "
                f"Body: {resp.text[:300]}"
            ),
        }

    try:
        body = resp.json()
    except Exception:  # noqa: BLE001
        body = {}

    call_id = body.get("id") if isinstance(body, dict) else None
    log.info("vapi call placed", to=settings.vapi_default_to, call_id=call_id)
    return {
        "status": "ok",
        "callId": call_id,
        "to": settings.vapi_default_to,
        "vapiStatus": body.get("status") if isinstance(body, dict) else None,
        "firstMessage": reminder_context,
    }
