"""Shared helpers for ERP tools.

`erp_safe` is the important one: it makes a tool RETURN its error instead of
raising. That matters because LangGraph persists the assistant's tool-call
request to the session before the tool runs; if the tool then raises, no
tool-result message is written and the whole thread becomes invalid
("AIMessage with tool_calls has no corresponding ToolMessage"), poisoning every
later turn. Returning an `{"error": ...}` value keeps the thread valid AND lets
the model react to the failure (e.g. "please attach the file").
"""

from __future__ import annotations

import functools
from collections.abc import Awaitable, Callable
from typing import Any

from app.core.errors import AppError
from app.core.logging import get_logger
from app.integrations.erp_client import ErpApiError

log = get_logger("tools.erp")


def _error_message(e: Exception) -> str:
    """Pull a human-readable message out of an ERP/app error."""
    if isinstance(e, ErpApiError):
        body = e.detail.get("details") if isinstance(e.detail, dict) else None
        msg: Any = None
        if isinstance(body, dict):
            err = body.get("error")
            if isinstance(err, dict):
                msg = err.get("message")
            msg = msg or body.get("message")
        return f"ERP backend rejected the request ({e.status_code}): {msg or body}"
    if isinstance(e, AppError):
        detail = e.detail
        if isinstance(detail, dict):
            return f"Error: {detail.get('message')}"
        return f"Error: {detail}"
    return f"Error: {e}"


def erp_safe(
    func: Callable[..., Awaitable[Any]],
) -> Callable[..., Awaitable[Any]]:
    """Wrap an async tool so any error is RETURNED (not raised). Returning a
    value keeps the LangGraph message history valid and lets the model react.

    NB: the result must NOT use a top-level "error" key — Gemini reserves
    "error"/"output" in a function response (the SDK raises KeyError('error')
    if "error" is present). We use {"status": "error", "message": ...} so the
    whole dict is treated as ordinary function output the model can read.
    """

    @functools.wraps(func)
    async def wrapper(*args: Any, **kwargs: Any) -> Any:
        try:
            return await func(*args, **kwargs)
        except Exception as e:  # noqa: BLE001
            log.warning("tool error", tool=func.__name__, error=str(e))
            return {"status": "error", "message": _error_message(e)}

    return wrapper
