from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.security import AuthPrincipal, require_active
from app.schemas.tool import ToolDescriptor
from app.tools import registry

router = APIRouter(prefix="/tools", tags=["tools"])


class ToolInvokeRequest(BaseModel):
    args: dict[str, Any] = {}


@router.get("", response_model=list[ToolDescriptor])
async def list_tools(_principal: AuthPrincipal = Depends(require_active)) -> list[ToolDescriptor]:
    return registry.descriptors()


@router.post("/{name}")
async def invoke_tool(
    name: str,
    body: ToolInvokeRequest,
    principal: AuthPrincipal = Depends(require_active),
) -> dict[str, Any]:
    result = await registry.call(name, body.args, principal)
    return {"name": name, "result": result}
