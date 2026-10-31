"""Shared FastAPI dependencies for session auth and plan lookup."""

from __future__ import annotations

from typing import Any, Dict, Optional

from bson import ObjectId
from fastapi import HTTPException, Request

import config
from db import get_plans_collection, get_users_collection
from plan_views import assert_plan_access
from security import decode_session_cookie

COOKIE_NAME = "session_id"
OAUTH_STATE_COOKIE = "oauth_state"
COOKIE_SECURE = config.COOKIE_SECURE


def session_cookie_kwargs() -> Dict[str, Any]:
    return {
        "httponly": True,
        "secure": COOKIE_SECURE,
        "samesite": "lax",
        "max_age": 14 * 86400,
    }


async def get_current_user(request: Request) -> Optional[Dict[str, Any]]:
    """Verify the signed httpOnly session cookie and load the user document."""
    cookie_val = request.cookies.get(COOKIE_NAME)
    if not cookie_val:
        return None

    session_data = decode_session_cookie(cookie_val)
    if not session_data or "user_id" not in session_data:
        return None

    users_col = get_users_collection()
    try:
        user_id = ObjectId(session_data["user_id"])
        return await users_col.find_one({"_id": user_id})
    except Exception:
        return None


def parse_id(id_val: str) -> Any:
    """Supports both MongoDB ObjectId and string IDs."""
    try:
        return ObjectId(id_val)
    except Exception:
        return id_val


async def load_plan(plan_id: str, user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    plans_col = get_plans_collection()
    search_id = parse_id(plan_id)
    plan_doc = await plans_col.find_one({"$or": [{"_id": search_id}, {"id": search_id}]})
    if not plan_doc:
        raise HTTPException(status_code=404, detail="Plan not found")
    assert_plan_access(plan_doc, user)
    return plan_doc
