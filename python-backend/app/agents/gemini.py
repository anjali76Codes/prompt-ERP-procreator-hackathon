"""Gemini agent — minimal scaffold using the `google-genai` SDK.

If `GEMINI_API_KEY` is missing, falls back to a canned reply so the frontend
can be exercised offline. Extend this to:

- pass the registry's tool descriptors as `tools=[...]` (Gemini function calling)
- loop on tool-call responses dispatching through `registry.call(...)`
- emit a Workflow plan when the user describes a multi-step automation.
"""

from __future__ import annotations

import asyncio

from app.agents.base import Agent
from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.security import AuthPrincipal
from app.schemas.chat import ChatMessage, ChatResponse

log = get_logger("agent.gemini")

SYSTEM_PROMPT = (
    "You are the Prompt ERP automation assistant. Be concise and describe "
    "multi-step automations as a numbered plan."
)


class GeminiAgent(Agent):
    def __init__(self) -> None:
        self._settings = get_settings()
        self._client = None
        if self._settings.gemini_api_key:
            try:
                from google import genai  # type: ignore[import-not-found]

                self._client = genai.Client(api_key=self._settings.gemini_api_key)
            except Exception as e:  # noqa: BLE001
                log.warning("google-genai SDK unavailable; using offline stub", error=str(e))

    async def chat(
        self,
        *,
        message: str,
        history: list[ChatMessage],
        principal: AuthPrincipal,
    ) -> ChatResponse:
        if not self._client:
            return ChatResponse(
                reply=(
                    f"(offline stub) Hi {principal.role} — I received: {message!r}. "
                    "Set GEMINI_API_KEY to enable the real Gemini agent."
                )
            )

        # Gemini message format: list of {role, parts:[{text}]}.
        # role must be 'user' or 'model'.
        contents = [
            {
                "role": "user" if m.role == "user" else "model",
                "parts": [{"text": m.text}],
            }
            for m in history
        ]
        contents.append({"role": "user", "parts": [{"text": message}]})

        # The current `google-genai` SDK exposes a sync `models.generate_content`.
        # Run it in a worker thread to keep the request loop async-friendly.
        def _call():  # type: ignore[no-untyped-def]
            return self._client.models.generate_content(  # type: ignore[union-attr]
                model=self._settings.gemini_model,
                contents=contents,
                config={
                    "system_instruction": SYSTEM_PROMPT,
                    "max_output_tokens": self._settings.gemini_max_output_tokens,
                },
            )

        response = await asyncio.to_thread(_call)
        reply = getattr(response, "text", None) or "(no reply)"
        return ChatResponse(reply=reply.strip())
