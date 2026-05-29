"""Resolution tools: map human names ("TE-A", "Data Structures", "OS") to
ObjectIds.

The Express API takes Mongo ObjectIds for `division` and `subject`. The agent
calls these first to turn what the user typed into the IDs every other tool
needs. Both return compact rows so the LLM can pick the right match (or ask the
user to disambiguate).

Matching is tiered so the agent doesn't ping-pong on common abbreviations:
  1. Empty query  -> everything.
  2. Exact code   -> any row whose `code` matches the query verbatim (case-fold).
  3. Substring    -> query appears inside the code or name.
  4. Initials     -> e.g. "OS" picks up "Operating Systems", "DSA" picks up
                     "Data Structures and Algorithms". Triggered when the query
                     is 2–5 chars, mostly letters, and no substring match hit.
The first tier that returns ANY rows wins, so a real substring beats an
initials match.
"""

from __future__ import annotations

import re
from typing import Any

from langchain_core.tools import tool

from app.agents.run_context import current_run_context
from app.tools.erp._util import erp_safe

# Words we ignore when computing initials so "Data Structures and Algorithms"
# initialises to "DSA" rather than "DSAA".
_STOPWORDS = {"and", "of", "the", "to", "for", "in", "on", "a", "an", "with"}


def _initials(name: str) -> str:
    if not name:
        return ""
    tokens = re.findall(r"[A-Za-z][A-Za-z0-9]*", name)
    return "".join(
        t[0].lower() for t in tokens if t.lower() not in _STOPWORDS
    )


def _matches_substring(row: dict[str, Any], q_lower: str) -> bool:
    return (
        q_lower in str(row.get("code", "") or "").lower()
        or q_lower in str(row.get("name", "") or "").lower()
    )


def _matches_initials(row: dict[str, Any], q_compact: str) -> bool:
    """`q_compact` is the query stripped of non-alpha chars and lowercased.
    A row matches if the query equals or prefixes the name's initials."""
    if not q_compact:
        return False
    init = _initials(str(row.get("name", "") or ""))
    return bool(init) and (init == q_compact or init.startswith(q_compact))


def _filter(rows: list[dict[str, Any]], query: str) -> list[dict[str, Any]]:
    if not query:
        return rows
    q = query.strip()
    q_lower = q.lower()
    q_compact = re.sub(r"[^a-z0-9]", "", q_lower)

    # Tier 2: exact code match.
    exact = [r for r in rows if str(r.get("code", "") or "").lower() == q_lower]
    if exact:
        return exact

    # Tier 3: substring on code or name.
    subs = [r for r in rows if _matches_substring(r, q_lower)]
    if subs:
        return subs

    # Tier 4: initials match for short, mostly-alpha queries.
    if 2 <= len(q_compact) <= 5 and q_compact.isalpha():
        init = [r for r in rows if _matches_initials(r, q_compact)]
        if init:
            return init

    return []


@tool
@erp_safe
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
    return _filter(out, query)


@tool
@erp_safe
async def list_subjects(query: str = "") -> list[dict[str, Any]]:
    """List subjects, optionally filtered by name, code, OR a short abbreviation.

    Use this to resolve a subject the user named into its `id`. Examples that
    all resolve to "Operating Systems": "Operating Systems", "operating",
    "OS", "os", "CS-302" (if that's the code). Examples for "Data Structures
    and Algorithms": "DSA", "Data Structures", "dsa".

    Returns rows of {id, code, name, year, minAttendancePct}. If multiple
    subjects match, present them to the user and ask which one.
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
    return _filter(out, query)
