"""Thin async client for the Express ("Node") ERP backend.

Every call forwards the *caller's* JWT (the same token the frontend sent to this
service), so the Express backend applies its own `requireAuth` / `requireRole`
checks. We never mint tokens here — we just relay the user's identity downstream.

Endpoints mirror `express-backend/src/routes/*`. Base URL comes from
`settings.node_api_url` (default `http://localhost:3000/api`).
"""

from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings
from app.core.errors import AppError, bad_request
from app.core.logging import get_logger

log = get_logger("erp_client")

# A single uploaded file: (filename, bytes, content_type). The multipart field
# name is always "files" — Express mounts `resourceUpload.array('files')`.
UploadFile = tuple[str, bytes, str]


class ErpApiError(AppError):
    """Raised when the Express backend returns a non-2xx response.

    Carries the downstream status + body so the agent can surface a useful
    message ("division not found", "validation failed", ...) instead of a
    generic 500.
    """

    def __init__(self, status_code: int, body: Any) -> None:
        super().__init__(status_code, "Express backend error", details=body)


class ErpClient:
    """Per-request client bound to one caller's bearer token."""

    def __init__(self, token: str, base_url: str | None = None, timeout: float = 30.0) -> None:
        self._token = token
        self._base_url = (base_url or get_settings().node_api_url).rstrip("/")
        self._timeout = timeout

    @property
    def _auth_headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._token}"}

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: Any = None,
        params: dict[str, Any] | None = None,
        files: list[UploadFile] | None = None,
        data: dict[str, Any] | None = None,
    ) -> Any:
        url = f"{self._base_url}/{path.lstrip('/')}"
        # Drop None query params so we don't send "?divisionId=None".
        clean_params = {k: v for k, v in (params or {}).items() if v is not None}

        # multipart: httpx wants files as (field, (filename, bytes, content_type)).
        # `files` items are (filename, bytes, content_type); the field is "files".
        multipart = (
            [("files", (f[0], f[1], f[2])) for f in files] if files else None
        )

        log.info("erp request", method=method, path=path, has_files=bool(files))
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.request(
                    method,
                    url,
                    headers=self._auth_headers,
                    json=json,
                    params=clean_params or None,
                    files=multipart,
                    data=data,
                )
        except httpx.HTTPError as e:
            raise bad_request(f"Could not reach ERP backend at {url}: {e}") from e

        if resp.status_code >= 400:
            try:
                body = resp.json()
            except Exception:  # noqa: BLE001
                body = resp.text
            log.warning("erp error", status=resp.status_code, body=body)
            raise ErpApiError(resp.status_code, body)

        if resp.status_code == 204 or not resp.content:
            return {}
        try:
            return resp.json()
        except Exception:  # noqa: BLE001
            return {"raw": resp.text}

    # --- generic verbs ---------------------------------------------------

    async def get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        return await self._request("GET", path, params=params)

    async def post(self, path: str, json: Any = None) -> Any:
        return await self._request("POST", path, json=json)

    async def patch(self, path: str, json: Any = None) -> Any:
        return await self._request("PATCH", path, json=json)

    async def delete(self, path: str) -> Any:
        return await self._request("DELETE", path)

    async def post_multipart(
        self, path: str, data: dict[str, Any], files: list[UploadFile]
    ) -> Any:
        # Form values must be strings for multipart/form-data.
        form = {k: str(v) for k, v in data.items() if v is not None}
        return await self._request("POST", path, data=form, files=files or None)

    async def get_bytes(
        self, path: str, params: dict[str, Any] | None = None
    ) -> tuple[bytes, str]:
        """Fetch a binary response (e.g. a streamed PDF). Returns (bytes, content_type)."""
        url = f"{self._base_url}/{path.lstrip('/')}"
        clean_params = {k: v for k, v in (params or {}).items() if v is not None}
        log.info("erp request (bytes)", path=path)
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(
                    url, headers=self._auth_headers, params=clean_params or None
                )
        except httpx.HTTPError as e:
            raise bad_request(f"Could not reach ERP backend at {url}: {e}") from e

        if resp.status_code >= 400:
            try:
                body = resp.json()
            except Exception:  # noqa: BLE001
                body = resp.text
            log.warning("erp error (bytes)", status=resp.status_code, body=body)
            raise ErpApiError(resp.status_code, body)
        return resp.content, resp.headers.get("content-type", "application/octet-stream")
