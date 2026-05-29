"""FastAPI app factory + ASGI entry point.

Run with:
    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.api import agents as agents_api
from app.api import grading as grading_api
from app.api import health as health_api
from app.api import tools as tools_api
from app.api import workflows as workflows_api
from app.core.config import get_settings
from app.core.errors import unhandled_exception_handler
from app.core.exports import exports_root
from app.core.logging import configure_logging, get_logger
from app.tools.builtin import register_builtin_tools

# All HTTP routes live under this prefix — mirrors the Express backend's
# `/api` convention so the same host can serve both without collisions.
API_PREFIX = "/python-app"


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    log = get_logger("startup")
    settings = get_settings()
    register_builtin_tools()
    log.info(
        "Prompt ERP Python backend ready",
        env=settings.environment,
        port=settings.port,
        cors=settings.cors_origin_list,
    )
    yield
    log.info("shutting down")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Prompt ERP — AI Orchestration",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Request logging — minimal, attaches latency.
    @app.middleware("http")
    async def _log_requests(request: Request, call_next):  # type: ignore[no-untyped-def]
        log = get_logger("http")
        import time

        start = time.perf_counter()
        response = await call_next(request)
        ms = (time.perf_counter() - start) * 1000
        log.info(
            "request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=round(ms, 2),
        )
        return response

    # Serve agent-produced files (PDFs, generated assignments, exports) via a
    # FileResponse route — `filename=` makes Starlette send
    # `Content-Disposition: attachment; filename="…"`, so the browser SAVES
    # the file on click instead of opening it inline. Random uuid filenames
    # keep the URLs unguessable.
    exports_dir = exports_root()

    @app.get(f"{API_PREFIX}/exports/{{name}}")
    async def download_export(name: str):  # type: ignore[no-untyped-def]
        # Path-traversal guard — only files directly inside exports_dir.
        candidate = (exports_dir / name).resolve()
        if exports_dir.resolve() not in candidate.parents and candidate != exports_dir.resolve() / name:
            raise HTTPException(status_code=400, detail="Bad filename")
        if not candidate.is_file():
            raise HTTPException(status_code=404, detail="Not found")
        return FileResponse(
            candidate,
            media_type="application/pdf" if name.lower().endswith(".pdf") else "application/octet-stream",
            filename=name,
        )

    app.include_router(health_api.router, prefix=API_PREFIX)
    app.include_router(agents_api.router, prefix=API_PREFIX)
    app.include_router(workflows_api.router, prefix=API_PREFIX)
    app.include_router(tools_api.router, prefix=API_PREFIX)
    app.include_router(grading_api.router, prefix=API_PREFIX)

    app.add_exception_handler(Exception, unhandled_exception_handler)
    return app


app = create_app()
