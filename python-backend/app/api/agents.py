from __future__ import annotations

from fastapi import APIRouter, Depends

from app.agents.gemini import GeminiAgent
from app.core.security import AuthPrincipal, require_active
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/agents", tags=["agents"])

_agent = GeminiAgent()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    principal: AuthPrincipal = Depends(require_active),
) -> ChatResponse:
    return await _agent.chat(
        message=body.message,
        history=body.history,
        principal=principal,
    )
