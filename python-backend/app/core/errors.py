"""HTTP error helpers + a global exception handler."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse

from app.core.logging import get_logger

log = get_logger("errors")


class AppError(HTTPException):
    """Base class for all application HTTP errors."""

    def __init__(self, status_code: int, message: str, details: Any = None) -> None:
        super().__init__(status_code=status_code, detail={"message": message, "details": details})


def bad_request(msg: str = "Bad request", details: Any = None) -> AppError:
    return AppError(status.HTTP_400_BAD_REQUEST, msg, details)


def unauthorized(msg: str = "Unauthorized") -> AppError:
    return AppError(status.HTTP_401_UNAUTHORIZED, msg)


def forbidden(msg: str = "Forbidden") -> AppError:
    return AppError(status.HTTP_403_FORBIDDEN, msg)


def not_found(msg: str = "Not found") -> AppError:
    return AppError(status.HTTP_404_NOT_FOUND, msg)


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    log.exception("Unhandled error", path=str(request.url.path), method=request.method)
    return JSONResponse(
        status_code=500,
        content={"error": {"message": "Internal server error"}},
    )
