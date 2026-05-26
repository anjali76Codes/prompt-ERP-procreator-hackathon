from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.errors import not_found
from app.core.security import AuthPrincipal, require_active
from app.schemas.workflow import CreateWorkflowRequest, ExecutionLog, Workflow
from app.workflows.engine import engine

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.post("", response_model=Workflow, status_code=201)
async def create_workflow(
    body: CreateWorkflowRequest,
    principal: AuthPrincipal = Depends(require_active),
) -> Workflow:
    wf = engine.plan_from_prompt(body.prompt)
    await engine.run(wf.id, principal)
    return wf


@router.get("", response_model=list[Workflow])
async def list_workflows(
    _principal: AuthPrincipal = Depends(require_active),
) -> list[Workflow]:
    return engine.list()


@router.get("/{workflow_id}", response_model=Workflow)
async def get_workflow(
    workflow_id: str,
    _principal: AuthPrincipal = Depends(require_active),
) -> Workflow:
    wf = engine.get(workflow_id)
    if wf is None:
        raise not_found(f"Workflow '{workflow_id}' not found")
    return wf


@router.get("/{workflow_id}/logs", response_model=list[ExecutionLog])
async def get_workflow_logs(
    workflow_id: str,
    _principal: AuthPrincipal = Depends(require_active),
) -> list[ExecutionLog]:
    return engine.logs(workflow_id)


@router.post("/{workflow_id}/pause", response_model=Workflow)
async def pause_workflow(
    workflow_id: str,
    _principal: AuthPrincipal = Depends(require_active),
) -> Workflow:
    engine.pause(workflow_id)
    wf = engine.get(workflow_id)
    if wf is None:
        raise not_found(f"Workflow '{workflow_id}' not found")
    return wf
