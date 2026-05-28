"""Chat endpoints — the prompt-driven automation entry point.

Two ways in, both run the same LangGraph agent:
- POST /agents/chat           JSON body (no files)
- POST /agents/chat/files     multipart/form-data (prompt + attached files)

The caller's JWT is forwarded to the Express backend by the tools, so the
Express layer keeps enforcing its own role/permission rules.
"""

from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile

from app.agents.erp_agent import run_agent
from app.core.errors import unauthorized
from app.core.security import AuthPrincipal, require_active
from app.integrations.erp_client import UploadFile as ErpUploadFile
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/agents", tags=["agents"])


def _bearer_token(request: Request) -> str:
    """Pull the raw bearer token so tools can relay it to the Express backend."""
    header = request.headers.get("authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise unauthorized("Missing or malformed Authorization header")
    return token


@router.post("/chat", response_model=ChatResponse, response_model_by_alias=True)
async def chat(
    body: ChatRequest,
    request: Request,
    principal: AuthPrincipal = Depends(require_active),
) -> ChatResponse:
    return await run_agent(
        message=body.message,
        session_id=body.session_id or uuid4().hex,
        principal=principal,
        token=_bearer_token(request),
        files=[],
        permission_response=body.permission_response,
    )


@router.post("/chat/files", response_model=ChatResponse, response_model_by_alias=True)
async def chat_with_files(
    request: Request,
    message: str = Form(...),
    session_id: str | None = Form(default=None),
    files: list[UploadFile] = File(default_factory=list),
    principal: AuthPrincipal = Depends(require_active),
) -> ChatResponse:
    uploads: list[ErpUploadFile] = []
    for f in files:
        data = await f.read()
        uploads.append(
            (f.filename or "upload", data, f.content_type or "application/octet-stream")
        )
    return await run_agent(
        message=message,
        session_id=session_id or uuid4().hex,
        principal=principal,
        token=_bearer_token(request),
        files=uploads,
    )
