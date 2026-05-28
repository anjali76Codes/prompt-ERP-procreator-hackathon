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


class PermissionResponse(BaseModel):
    """Sent by the chat UI when the user picks an option from the dropdown
    that ask_grading_permission rendered last turn."""
    value: str    # "allow" | "allow_for_all" | "deny"
    context: dict[str, Any] = Field(default_factory=dict)
    # If value == "deny", the user must also pick a score before submitting.
    override_score: float | None = Field(default=None, alias="overrideScore")

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
    # When the user picked a dropdown option last turn, the frontend echoes
    # the selection here so the agent gets it as structured input rather
    # than relying on the user to type "allow for all".
    permission_response: PermissionResponse | None = Field(
        default=None, alias="permissionResponse",
    )

    model_config = {"populate_by_name": True}


class ToolStep(BaseModel):
    tool: str
    args: dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Structured side-channels — the frontend renders these *in addition to*
# the plain-text `reply`. Tools push into these via the run context so the
# chat surface can show tables, file previews, navigation buttons, and the
# permission dropdown without trying to parse the LLM's prose.
# ---------------------------------------------------------------------------


class ChatTable(BaseModel):
    title: str | None = None
    columns: list[str]
    rows: list[list[Any]] = Field(default_factory=list)


class ChatAttachment(BaseModel):
    name: str
    url: str
    mime_type: str | None = Field(default=None, alias="mimeType")
    size_bytes: int | None = Field(default=None, alias="sizeBytes")

    model_config = {"populate_by_name": True}


class ChatNavigate(BaseModel):
    """A "go to <page>" hint the chat can render as a button."""
    label: str
    path: str  # relative path within the frontend SPA


class ChatPermissionOption(BaseModel):
    value: str   # machine token sent back on selection
    label: str   # what the dropdown shows
    description: str | None = None


class ChatPermission(BaseModel):
    """Tells the chat UI to show a dropdown and wait for a choice."""
    prompt: str
    options: list[ChatPermissionOption]
    # Opaque payload echoed back to the agent verbatim on the next turn so
    # the agent knows which student / submission the choice applies to.
    context: dict[str, Any] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    reply: str
    # Echoes the session the turn ran in (generated if the client omitted one).
    session_id: str | None = Field(default=None, alias="sessionId")
    # Tools the agent invoked this turn — handy for the workflow/log UI.
    tools_used: list[str] = Field(default_factory=list, alias="toolsUsed")
    steps: list[ToolStep] = Field(default_factory=list)
    # If the agent decided to spin up or update a workflow, return it here.
    workflow_id: str | None = Field(default=None, alias="workflowId")

    # Structured side-channels populated by tools — all optional.
    tables: list[ChatTable] = Field(default_factory=list)
    attachments: list[ChatAttachment] = Field(default_factory=list)
    navigate: ChatNavigate | None = None
    permission: ChatPermission | None = None

    model_config = {"populate_by_name": True}
