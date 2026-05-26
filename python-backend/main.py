"""Convenience launcher.

Equivalent to:
    uvicorn app.main:app --reload --host $HOST --port $PORT
"""

from __future__ import annotations

import uvicorn

from app.core.config import get_settings


def main() -> None:
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=not settings.is_production,
        log_config=None,  # we own logging via structlog
    )


if __name__ == "__main__":
    main()
