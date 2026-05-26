from __future__ import annotations

import time

from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(tags=["health"])
_BOOT_TS = time.time()


@router.get("/health")
async def health() -> dict[str, object]:
    settings = get_settings()
    return {
        "status": "ok",
        "uptime_seconds": round(time.time() - _BOOT_TS, 2),
        "environment": settings.environment,
    }
