"""Workflow domain — mirrors `frontend/src/lib/automation/types.ts`."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

StepKind = Literal[
    "data_retrieval", "analysis", "communication", "browser_action", "human_approval"
]
StepStatus = Literal["queued", "running", "completed", "failed", "skipped"]
WorkflowStatus = Literal["idle", "running", "paused", "completed", "failed"]


class WorkflowStepTag(BaseModel):
    text: str
    border_color: str = Field(alias="borderColor")


class WorkflowStep(BaseModel):
    id: str
    kind: StepKind
    label: str
    description: str
    color: str | None = None
    icon_bg: str | None = Field(default=None, alias="iconBg")
    detail: Any | None = None
    tags: list[WorkflowStepTag] = Field(default_factory=list)
    status: StepStatus = "queued"

    model_config = {"populate_by_name": True}


class Workflow(BaseModel):
    id: str
    name: str
    description: str
    status: WorkflowStatus = "idle"
    steps: list[WorkflowStep] = Field(default_factory=list)
    is_template: bool = Field(default=False, alias="isTemplate")
    created_at: int = Field(alias="createdAt")

    model_config = {"populate_by_name": True}


class CreateWorkflowRequest(BaseModel):
    """Frontend posts a natural-language prompt; engine plans + returns a Workflow."""

    prompt: str


class ExecutionLog(BaseModel):
    id: str
    ts: str
    level: Literal["info", "success", "warn", "error"]
    message: str
