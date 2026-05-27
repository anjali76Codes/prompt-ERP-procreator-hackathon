"""Resolution tools: map human names ("TE-A", "Data Structures") to ObjectIds.

The Express API takes Mongo ObjectIds for `division` and `subject`. The agent
calls these first to turn what the user typed into the IDs every other tool
needs. Both return compact rows so the LLM can pick the right match (or ask the
user to disambiguate).
"""

from __future__ import annotations

from typing import Any

from langchain_core.tools import tool

from app.agents.run_context import current_run_context


def _match(row: dict[str, Any], query: str) -> bool:
    if not query:
        return True
    q = query.lower().strip()
    return q in str(row.get("code", "")).lower() or q in str(row.get("name", "")).lower()


@tool
async def list_divisions(query: str = "") -> list[dict[str, Any]]:
    """List class divisions, optionally filtered by a name/code substring.

    Use this to resolve a division the user named (e.g. "TE-A", "third year A")
    into its `id`. Pass `query` to narrow the list; leave empty to see all.
    Returns rows of {id, code, name, year}.
    """
    data = await current_run_context().erp().get("/academic/divisions")
    rows = data.get("divisions", []) if isinstance(data, dict) else []
    out = [
        {
            "id": str(d.get("_id") or d.get("id")),
            "code": d.get("code"),
            "name": d.get("name"),
            "year": d.get("year"),
        }
        for d in rows
    ]
    return [r for r in out if _match(r, query)]


@tool
async def list_subjects(query: str = "") -> list[dict[str, Any]]:
    """List subjects, optionally filtered by a name/code substring.

    Use this to resolve a subject the user named (e.g. "Data Structures and
    Algorithms", "DSA", "CS-301") into its `id`. Returns rows of
    {id, code, name, year, minAttendancePct}.
    """
    data = await current_run_context().erp().get("/academic/subjects")
    rows = data.get("subjects", []) if isinstance(data, dict) else []
    out = [
        {
            "id": str(s.get("_id") or s.get("id")),
            "code": s.get("code"),
            "name": s.get("name"),
            "year": s.get("year"),
            "minAttendancePct": s.get("minAttendancePct"),
        }
        for s in rows
    ]
    return [r for r in out if _match(r, query)]
