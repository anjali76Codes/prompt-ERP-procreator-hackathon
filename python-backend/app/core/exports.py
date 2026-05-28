"""On-disk export staging for agent-produced files.

When a tool needs to hand the user back a file (an attendance PDF, a generated
assignment PDF), it writes bytes to `settings.exports_dir` under a random name
and returns the public URL. The directory is mounted by FastAPI at /exports/
(see `app/main.py`).

Random names = unguessable; no auth on the static mount keeps this dead simple.
"""

from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from app.core.config import get_settings


def exports_root() -> Path:
    """Return the on-disk directory, creating it if needed."""
    root = Path(get_settings().exports_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root


def save_export(content: bytes, *, filename: str, ext: str = "pdf") -> dict[str, str]:
    """Write `content` to a random file under exports_dir and return public info.

    `filename` is the *display* name shown to the user; the actual on-disk file
    uses a random uuid so the URL can't be guessed.
    """
    suffix = ext.lstrip(".")
    token = uuid4().hex
    on_disk = exports_root() / f"{token}.{suffix}"
    on_disk.write_bytes(content)

    base = get_settings().public_base_url.rstrip("/")
    return {
        "url": f"{base}/exports/{on_disk.name}",
        "filename": filename,
        "sizeBytes": str(len(content)),
    }
