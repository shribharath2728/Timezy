"""Shared FastAPI dependencies for Timezy: session authentication and ID parsing."""

from __future__ import annotations

from typing import Any, Dict, Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Request

import config
from db import get_users_collection
from security import decode_session_cookie

COOKIE_NAME = "session_id"
OAUTH_STATE_COOKIE = "oauth_state"
COOKIE_SECURE: bool = config.COOKIE_SECURE


def session_cookie_kwargs() -> Dict[str, Any]:
    """Returns kwargs for ``response.set_cookie()`` with secure, httpOnly settings."""
    return {
        "httponly": True,
        "secure": COOKIE_SECURE,
        "samesite": "lax",
        "max_age": 14 * 86400,
    }


async def get_current_user(request: Request) -> Optional[Dict[str, Any]]:
    """Verifies the signed httpOnly session cookie and returns the user document.

    Returns ``None`` (anonymous) when:
    - No session cookie is present.
    - The cookie signature is invalid or expired.
    - The user document no longer exists in the database.

    Only ``InvalidId`` and ``LookupError`` from ObjectId parsing are silently swallowed;
    all other exceptions propagate so they are visible as 500 errors rather than
    silently treating a DB outage as an anonymous session.
    """
    cookie_val = request.cookies.get(COOKIE_NAME)
    if not cookie_val:
        return None

    session_data = decode_session_cookie(cookie_val)
    if not session_data or "user_id" not in session_data:
        return None

    users_col = get_users_collection()
    try:
        user_id = ObjectId(session_data["user_id"])
    except (InvalidId, Exception):
        return None

    return await users_col.find_one({"_id": user_id})


def parse_id(id_val: str) -> Any:
    """Parses *id_val* as a MongoDB ``ObjectId`` when valid; otherwise returns the raw string.

    This allows route handlers to look up documents by either ObjectId or legacy string id.
    """
    try:
        return ObjectId(id_val)
    except (InvalidId, Exception):
        return id_val
