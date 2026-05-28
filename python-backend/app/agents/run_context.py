"""Per-request run context for ERP tools.

LangChain tools receive only the arguments the LLM produces — they have no way
to see the caller's JWT or any files the user attached. We bridge that gap with
a `ContextVar` set by the chat endpoint before the agent runs and read by the
tools when they need to call the Express backend.

`ContextVar`s are isolated per asyncio task (each request handler is its own
task) and are *copied* into child tasks spawned by `asyncio.gather`, so parallel
tool calls within one request all see the same context. Different concurrent
requests never see each other's context.
"""

from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import Iterator

from app.core.errors import bad_request
from app.core.security import AuthPrincipal
from app.integrations.erp_client import ErpClient, UploadFile


@dataclass
class RunContext:
    """Everything a tool might need beyond its LLM-supplied arguments."""

    principal: AuthPrincipal
    token: str
    # Files the user attached to this turn, as (field, bytes, content_type).
    files: list[UploadFile] = field(default_factory=list)

    def erp(self) -> ErpClient:
        return ErpClient(self.token)

    def take_files(self) -> list[UploadFile]:
        """Return attached files and clear them so a second tool call in the
        same turn doesn't re-upload the same bytes."""
        files, self.files = self.files, []
        return files


_current: ContextVar[RunContext | None] = ContextVar("erp_run_context", default=None)


def current_run_context() -> RunContext:
    ctx = _current.get()
    if ctx is None:
        # A tool was invoked outside a chat request — programmer error.
        raise bad_request("No active run context — tools must run inside a chat request")
    return ctx


@contextmanager
def use_run_context(ctx: RunContext) -> Iterator[RunContext]:
    token = _current.set(ctx)
    try:
        yield ctx
    finally:
        _current.reset(token)
