"""Shared plan serialization so route handlers do not duplicate response shape."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from bson import ObjectId
from fastapi import HTTPException, status

from planner import DEFAULT_TIMEZONE, format_for_display


def serialize_doc(doc: Dict[str, Any], user_tz: Optional[str] = None) -> Dict[str, Any]:
    """Convert MongoDB _id and UTC datetimes to JSON-serializable types."""
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


def assert_plan_access(plan_doc: Dict[str, Any], user: Optional[Dict[str, Any]]) -> None:
    """Authenticated users may only access their own plans. Anonymous access stays allowed for drafts."""
    if not user:
        return
    owner = str(plan_doc.get("user_id") or "")
    uid = str(user.get("_id") or "")
    if owner in ("", "anonymous"):
        return
    if owner != uid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")


def owner_query(user: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if user:
        return {"user_id": str(user["_id"])}
    return {"user_id": "anonymous"}
