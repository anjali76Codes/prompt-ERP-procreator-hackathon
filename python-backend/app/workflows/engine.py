"""In-memory workflow engine.

A `Workflow` is a planned sequence of steps. The engine:

1. accepts a user prompt → produces an initial plan,
2. runs the steps one by one (calling Tools via the registry),
3. exposes the live state to the frontend (poll or stream — your choice).

This first cut keeps everything in-process; swap `_workflows` for Redis /
Mongo when you need persistence + multi-worker support.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from typing import Any

from app.core.logging import get_logger
from app.core.security import AuthPrincipal
from app.schemas.workflow import ExecutionLog, Workflow, WorkflowStep
from app.tools import registry

log = get_logger("workflows")


def _uid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12]}"


def _now_ts() -> str:
    return time.strftime("[%H:%M:%S]")


class WorkflowEngine:
    """Single-process workflow runner."""

    def __init__(self) -> None:
        self._workflows: dict[str, Workflow] = {}
        self._logs: dict[str, list[ExecutionLog]] = {}
        self._tasks: dict[str, asyncio.Task[None]] = {}

    # ---- queries --------------------------------------------------------
    def get(self, workflow_id: str) -> Workflow | None:
        return self._workflows.get(workflow_id)

    def list(self) -> list[Workflow]:
        return list(self._workflows.values())

    def logs(self, workflow_id: str) -> list[ExecutionLog]:
        return self._logs.get(workflow_id, [])

    # ---- planning + execution ------------------------------------------
    def plan_from_prompt(self, prompt: str) -> Workflow:
        """Heuristic planner — extend with the Claude agent when ready."""
        wf = Workflow(
            id=_uid("wf_"),
            name=prompt[:60] + ("…" if len(prompt) > 60 else ""),
            description=prompt,
            status="idle",
            steps=[
                WorkflowStep(
                    id=_uid("st_"),
                    kind="data_retrieval",
                    label="DATA RETRIEVAL",
                    description="Fetch relevant ERP records.",
                ),
                WorkflowStep(
                    id=_uid("st_"),
                    kind="analysis",
                    label="ANALYSIS",
                    description="Identify candidates that match the prompt's criteria.",
                ),
                WorkflowStep(
                    id=_uid("st_"),
                    kind="communication",
                    label="COMMUNICATION",
                    description="Notify stakeholders or produce a report.",
                ),
            ],
            createdAt=int(time.time() * 1000),
        )
        self._workflows[wf.id] = wf
        self._logs[wf.id] = []
        return wf

    async def run(self, workflow_id: str, principal: AuthPrincipal) -> None:
        wf = self._workflows.get(workflow_id)
        if wf is None:
            raise KeyError(workflow_id)
        if workflow_id in self._tasks and not self._tasks[workflow_id].done():
            return  # already running

        async def _runner() -> None:
            wf.status = "running"
            try:
                for step in wf.steps:
                    step.status = "running"
                    self._log(wf.id, "info", f"→ {step.label}: {step.description}")
                    await asyncio.sleep(1.5)  # placeholder for tool execution
                    step.status = "completed"
                    self._log(wf.id, "success", f"✓ {step.label} completed")
                wf.status = "completed"
            except Exception as e:  # noqa: BLE001
                wf.status = "failed"
                self._log(wf.id, "error", f"Workflow failed: {e}")
                log.exception("workflow run failed", workflow_id=wf.id)

        self._tasks[workflow_id] = asyncio.create_task(_runner(), name=f"wf:{workflow_id}")
        _ = principal  # reserved for future per-user tool dispatch

    def pause(self, workflow_id: str) -> None:
        wf = self._workflows.get(workflow_id)
        if wf and wf.status == "running":
            wf.status = "paused"
            self._log(workflow_id, "warn", "Workflow paused by user")

    # ---- helpers --------------------------------------------------------
    def _log(self, workflow_id: str, level: str, message: str) -> None:
        entry = ExecutionLog(id=_uid("lg_"), ts=_now_ts(), level=level, message=message)  # type: ignore[arg-type]
        self._logs.setdefault(workflow_id, []).append(entry)


engine = WorkflowEngine()


# Wire-through so the engine can dispatch tool calls (currently unused — see
# `_runner`). Kept here for the next iteration.
async def call_tool(name: str, args: dict[str, Any], principal: AuthPrincipal) -> Any:
    return await registry.call(name, args, principal)
