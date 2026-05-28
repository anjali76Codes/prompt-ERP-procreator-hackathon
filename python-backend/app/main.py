"""FastAPI app factory + ASGI entry point.

Run with:
    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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

    # Serve agent-produced files (PDFs, generated assignments, exports). The
    # directory is created lazily on first write — pre-create it here so the
    # mount never fails on startup.
    app.mount(
        "/exports",
        StaticFiles(directory=str(exports_root())),
        name="exports",
    )

    app.include_router(health_api.router)
    app.include_router(agents_api.router)
    app.include_router(workflows_api.router)
    app.include_router(tools_api.router)
    app.include_router(grading_api.router)

    app.add_exception_handler(Exception, unhandled_exception_handler)
    return app


app = create_app()
