"""Direct grading endpoint — lets the teacher's review dashboard run AI grading
without going through the chat agent. Reuses the same `grade_submissions_with_rubric`
core logic; the .invoke() call here is just a typed wrapper around the tool
function so we get the same Pydantic-validated payload.
"""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, Request

from app.agents.run_context import RunContext, use_run_context
from app.core.errors import unauthorized
from app.core.security import AuthPrincipal, require_active
from app.tools.erp.grading import grade_submissions_with_rubric

router = APIRouter(prefix="/grading", tags=["grading"])


def _bearer_token(request: Request) -> str:
    header = request.headers.get("authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise unauthorized("Missing or malformed Authorization header")
    return token


@router.post("/run/{resource_id}")
async def run_ai_grading(
    resource_id: str,
    request: Request,
    limit: Optional[int] = None,
    principal: AuthPrincipal = Depends(require_active),
) -> dict[str, Any]:
    """Run AI grading on every submission for this assignment and store the
    results as PROPOSED grades. The teacher reviews + publishes from the
    dashboard. Returns the same summary the agent's tool would have.
    """
    ctx = RunContext(principal=principal, token=_bearer_token(request))
    with use_run_context(ctx):
        # `grade_submissions_with_rubric` is a @tool — invoke its underlying
        # function via .ainvoke for the right async path.
        result = await grade_submissions_with_rubric.ainvoke(
            {"resource_id": resource_id, "limit": limit}
        )
    return result if isinstance(result, dict) else {"result": result}
