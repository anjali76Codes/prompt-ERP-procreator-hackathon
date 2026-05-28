"""Agent chat schemas."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

ChatRole = Literal["user", "ai", "system"]


class ChatMessage(BaseModel):
    id: str
    role: ChatRole
    text: str
    created_at: int = Field(alias="createdAt")

    model_config = {"populate_by_name": True}


class ChatRequest(BaseModel):
    """Frontend posts the latest user message + the session it belongs to.

    Conversation state is kept server-side per `session_id` (LangGraph
    checkpointer), so `history` is optional and only used as a hint.
    """

    message: str
    # Stable per-conversation id; the agent keys its memory on this.
    session_id: str | None = Field(default=None, alias="sessionId")
    history: list[ChatMessage] = Field(default_factory=list)
    # Optional ID of the workflow being discussed.
    workflow_id: str | None = Field(default=None, alias="workflowId")

    model_config = {"populate_by_name": True}


class ToolStep(BaseModel):
    tool: str
    args: dict[str, Any] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    reply: str
    # Echoes the session the turn ran in (generated if the client omitted one).
    session_id: str | None = Field(default=None, alias="sessionId")
    # Tools the agent invoked this turn — handy for the workflow/log UI.
    tools_used: list[str] = Field(default_factory=list, alias="toolsUsed")
    steps: list[ToolStep] = Field(default_factory=list)
    # If the agent decided to spin up or update a workflow, return it here.
    workflow_id: str | None = Field(default=None, alias="workflowId")

    model_config = {"populate_by_name": True}
