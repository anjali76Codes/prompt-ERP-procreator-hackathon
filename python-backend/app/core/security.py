"""JWT verification — trusts tokens minted by the Node backend."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import jwt
from fastapi import Depends, Request

from app.core.config import get_settings
from app.core.errors import forbidden, unauthorized

Role = Literal["student", "teacher", "admin"]
Status = Literal["pending", "active", "rejected"]


@dataclass(frozen=True)
class AuthPrincipal:
    """The verified caller — extracted from the JWT issued by the Node backend."""

    sub: str
    role: Role
    status: Status


def _extract_bearer(request: Request) -> str:
    header = request.headers.get("authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise unauthorized("Missing or malformed Authorization header")
    return token


def require_auth(request: Request) -> AuthPrincipal:
    """FastAPI dependency: decode + verify the JWT, return the principal."""
    settings = get_settings()
    if not settings.jwt_secret:
        raise unauthorized("JWT verification not configured on this service")

    token = _extract_bearer(request)
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError as e:
        raise unauthorized("Token expired") from e
    except jwt.InvalidTokenError as e:
        raise unauthorized("Invalid token") from e

    sub = payload.get("sub")
    role = payload.get("role")
    status = payload.get("status", "active")
    if not sub or role not in ("student", "teacher", "admin"):
        raise unauthorized("Malformed token payload")

    return AuthPrincipal(sub=sub, role=role, status=status)


def require_role(*allowed: Role):
    """Dependency factory: enforce one of the allowed roles on top of `require_auth`."""

    def _dep(principal: AuthPrincipal = Depends(require_auth)) -> AuthPrincipal:
        if principal.role not in allowed:
            raise forbidden(f"Requires one of: {', '.join(allowed)}")
        return principal

    return _dep


def require_active(principal: AuthPrincipal = Depends(require_auth)) -> AuthPrincipal:
    if principal.status != "active":
        raise forbidden("Account is not active")
    return principal
