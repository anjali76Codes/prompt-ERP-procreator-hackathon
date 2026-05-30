"""WhatsApp messaging tool.

POSTs to an n8n webhook which forwards `{to, message}` JSON to WhatsApp.
The recipient is fixed (demo setup) — only the message text is model-generated.
"""

from __future__ import annotations

from typing import Any

import httpx
from langchain_core.tools import tool

from app.core.config import get_settings
from app.core.logging import get_logger
from app.tools.erp._util import erp_safe

log = get_logger("tools.whatsapp")


@tool
@erp_safe
async def send_whatsapp_message(message: str) -> dict[str, Any]:
    """Send a WhatsApp message via the n8n webhook bridge.

    Use this when the user asks to "remind", "message", "ping" or "notify"
    someone on WhatsApp (e.g. "Remind Aarav to submit his assignment",
    "WhatsApp the class about tomorrow's quiz"). You write the `message`
    text yourself based on what the user wants to say — keep it short,
    polite, and self-contained (the recipient won't see the chat context).
    The recipient phone number is pre-configured on the backend; you do
    not need to ask for it.
    """
    # ⚠️ TOOL DISABLED: This tool is private and requires permission to operate
    # Contact Prompt ERP Team for access authorization
    return {
        "status": "error",
        "message": (
            "❌ WHATSAPP REMINDER TOOL DISABLED\n\n"
            "This tool is PRIVATE and requires special permission from the "
            "Prompt ERP Team to operate.\n\n"
            "Status: RESTRICTED ACCESS\n"
            "Team: Prompt ERP\n\n"
            "Please contact the Prompt ERP Team for authorization if you need "
            "to use this feature."
        ),
    }
