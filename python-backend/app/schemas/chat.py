"""Agent chat schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

ChatRole = Literal["user", "ai", "system"]


class ChatMessage(BaseModel):
    id: str
    role: ChatRole
    text: str
    created_at: int = Field(alias="createdAt")

    model_config = {"populate_by_name": True}


class ChatRequest(BaseModel):
    """Frontend posts the latest user message + optional prior history."""

    message: str
    history: list[ChatMessage] = Field(default_factory=list)
    # Optional ID of the workflow being discussed.
    workflow_id: str | None = None


class ChatResponse(BaseModel):
    reply: str
    # If the agent decided to spin up or update a workflow, return it here.
    workflow_id: str | None = None
