"""Shared plan serialization and access-control helpers.

Route handlers use these utilities to ensure a consistent response shape and
a uniform ownership policy, avoiding duplicated serialization logic.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from bson import ObjectId
from fastapi import HTTPException, status

from planner import DEFAULT_TIMEZONE, format_for_display


def serialize_doc(doc: Dict[str, Any], user_tz: Optional[str] = None) -> Dict[str, Any]:
    """Converts a raw MongoDB document to a JSON-serialisable dict.

    - ``_id`` (ObjectId) is converted to a string and exposed as both ``id`` and ``_id``.
    - All ``ObjectId`` values in the document are stringified.
    - All ``datetime`` values are formatted as ISO strings in *user_tz*.

    Args:
        doc: Raw MongoDB document dict.
        user_tz: IANA timezone for datetime formatting. Falls back to the document's
                 own ``tz`` field, then ``DEFAULT_TIMEZONE``.

    Returns:
        A shallow copy of *doc* with serialised types.
    """
    if not doc:
        return doc
    res = dict(doc)
    doc_id = res.pop("_id", None)
    if doc_id is not None:
        res["id"] = str(doc_id)
        res["_id"] = str(doc_id)

    tz = user_tz or res.get("tz") or res.get("user_timezone", DEFAULT_TIMEZONE)

    for k, v in list(res.items()):
        if isinstance(v, ObjectId):
            res[k] = str(v)
        elif isinstance(v, datetime):
            res[k] = format_for_display(v, tz)

    return res


def plan_response(doc: Dict[str, Any], extra: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Builds the standard plan API response shape from a MongoDB plan document.

    Adds ``date``, ``plan`` (budget_plan summary), and ``reminders`` keys so all
    route handlers return the same structure without duplicating this logic.

    Args:
        doc: Raw MongoDB plan document.
        extra: Optional additional keys to merge into the response.

    Returns:
        Serialised plan response dict.
    """
    tz = doc.get("tz", DEFAULT_TIMEZONE)
    serialized = serialize_doc(doc, tz)
    event_start = doc.get("event_start")
    serialized["date"] = format_for_display(event_start, tz) if event_start else None
    serialized["plan"] = {
        "items": doc.get("budget_plan", {}).get("items", []),
        "buffer": doc.get("budget_plan", {}).get("buffer", 0),
        "total": doc.get("budget_plan", {}).get("total", doc.get("budget", 0)),
        "vendors": doc.get("items", []),
        "ideas": doc.get("ideas", []),
    }
    serialized["reminders"] = []
    if extra:
        serialized.update(extra)
    return serialized


def assert_plan_access(
    plan_doc: Dict[str, Any], user: Optional[Dict[str, Any]]
) -> None:
    """Enforces plan ownership rules.

    Policy:
    - **Unauthenticated callers** may always access any plan (anonymous drafts created
      without a login session have ``user_id = "anonymous"`` and must remain reachable).
    - **Authenticated callers** may access:
      - Plans they own (``plan.user_id == str(user._id)``).
      - Plans with no owner or an ``"anonymous"`` owner (shared/public drafts).

    This means any authenticated user can read or modify an anonymous plan if they
    know its ID — acceptable for a client-side-first app where anonymous plans are
    essentially session-scoped. Tighten this policy (e.g. session-UUID ownership)
    if stricter isolation is needed.

    Raises:
        HTTPException(404): When an authenticated user attempts to access another
                            user's private plan (returns 404 rather than 403 to avoid
                            leaking plan existence).
    """
    if not user:
        # Unauthenticated — allow; anonymous plans are publicly accessible by design.
        return
    owner = str(plan_doc.get("user_id") or "")
    uid = str(user.get("_id") or "")
    if owner in ("", "anonymous"):
        # Unowned plan — accessible to any authenticated user.
        return
    if owner != uid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")


def owner_query(user: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Returns a MongoDB filter dict scoped to the current user (or anonymous plans).

    Args:
        user: Authenticated user document, or ``None`` for anonymous callers.

    Returns:
        ``{"user_id": str(user._id)}`` for authenticated users, or
        ``{"user_id": "anonymous"}`` otherwise.
    """
    if user:
        return {"user_id": str(user["_id"])}
    return {"user_id": "anonymous"}
