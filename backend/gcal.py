"""Google Calendar integration for Timezy.

Provides OAuth helpers, CRUD operations on calendar events, incremental sync,
and utility functions for iCalendar (.ics) and web-URL generation.

Access tokens are cached per-user in a module-level dict (keyed by user MongoDB _id)
with a 55-minute TTL so that consecutive calendar operations within a plan scheduling
run do not each incur an extra token-refresh HTTP round-trip.
"""

import os
import time
import urllib.parse
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

import httpx
from fastapi import HTTPException, status

from security import decrypt_token
import config  # noqa: F401

GOOGLE_CLIENT_ID: Optional[str] = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET: Optional[str] = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/callback")
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3"

# Scopes: openid, email, profile, calendar.events
SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/calendar.events",
]

# ---------------------------------------------------------------------------
# Access-token cache: {user_id_str: (access_token, expires_at_epoch)}
# Tokens are valid for 3600 s; we cache them for 55 min to be conservative.
# ---------------------------------------------------------------------------
_TOKEN_CACHE: Dict[str, Tuple[str, float]] = {}
_TOKEN_TTL_SECONDS = 55 * 60  # 55 minutes


def _cache_key(user: Dict[str, Any]) -> str:
    return str(user.get("_id") or user.get("id") or "anon")


def _get_cached_token(user: Dict[str, Any]) -> Optional[str]:
    key = _cache_key(user)
    entry = _TOKEN_CACHE.get(key)
    if entry:
        token, expires_at = entry
        if time.monotonic() < expires_at:
            return token
        del _TOKEN_CACHE[key]
    return None


def _set_cached_token(user: Dict[str, Any], token: str) -> None:
    _TOKEN_CACHE[_cache_key(user)] = (token, time.monotonic() + _TOKEN_TTL_SECONDS)


# ---------------------------------------------------------------------------
# OAuth helpers
# ---------------------------------------------------------------------------

def get_oauth_login_url(state: str) -> str:
    """Builds the Google OAuth authorization URL (authorization code flow).

    Uses ``access_type=offline`` and ``prompt=consent`` to obtain a refresh token.
    """
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"


async def exchange_code_for_tokens(code: str) -> Dict[str, Any]:
    """Exchanges an authorization code for ``access_token``, ``refresh_token``, and ``id_token``."""
    payload = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": GOOGLE_REDIRECT_URI,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data=payload)
        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to exchange authorization code with Google: {resp.text}",
            )
        return resp.json()


async def get_valid_access_token(user: Dict[str, Any]) -> str:
    """Returns a valid Google access token for *user*, refreshing if necessary.

    Tokens are cached in-memory for 55 minutes so that repeated calendar calls
    within a single request (e.g. scheduling 10 items) only refresh once.

    Raises:
        HTTPException(401): When the refresh token is missing, corrupted, or revoked.
    """
    # Fast path: return cached token if still valid
    cached = _get_cached_token(user)
    if cached:
        return cached

    encrypted_rt = user.get("encrypted_refresh_token")
    if not encrypted_rt:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google account not connected or refresh token missing. Please log in again.",
        )

    try:
        refresh_token = decrypt_token(encrypted_rt)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid encrypted token. Please re-authenticate.",
        )

    payload = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data=payload)
        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Google refresh token expired or revoked. Please re-login. ({resp.text})",
            )
        access_token: str = resp.json()["access_token"]
        _set_cached_token(user, access_token)
        return access_token


async def fetch_user_info(access_token: str) -> Dict[str, Any]:
    """Fetches user profile (``google_id``, ``email``) from the Google userinfo API."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to fetch user profile with provided access token",
            )
        return resp.json()


# ---------------------------------------------------------------------------
# Google Calendar operations
# ---------------------------------------------------------------------------

async def busy_blocks(
    user: Dict[str, Any], start: datetime, end: datetime
) -> List[Dict[str, str]]:
    """Retrieves busy time blocks between *start* and *end* via ``events.list``.

    Transparent (free) events are excluded from the result.
    """
    access_token = await get_valid_access_token(user)

    params = {
        "timeMin": start.astimezone(timezone.utc).isoformat(),
        "timeMax": end.astimezone(timezone.utc).isoformat(),
        "singleEvents": "true",
        "orderBy": "startTime",
    }

    url = f"{CALENDAR_API_BASE}/calendars/primary/events"
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, params=params, headers={"Authorization": f"Bearer {access_token}"})
        if resp.status_code == 401:
            raise HTTPException(status_code=401, detail="Google access token expired or revoked.")
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"Google Calendar error: {resp.text}")

        blocks: List[Dict[str, str]] = []
        for ev in resp.json().get("items", []):
            if ev.get("transparency") == "transparent":
                continue
            ev_start = ev.get("start", {}).get("dateTime") or ev.get("start", {}).get("date")
            ev_end = ev.get("end", {}).get("dateTime") or ev.get("end", {}).get("date")
            if ev_start and ev_end:
                blocks.append({"start": ev_start, "end": ev_end, "summary": ev.get("summary", "Busy")})
        return blocks


async def create_event(
    user: Dict[str, Any],
    title: str,
    start: datetime,
    end: datetime,
    color_id: Optional[str] = None,
    reminders: Optional[Dict[str, Any]] = None,
    private_props: Optional[Dict[str, str]] = None,
    description: Optional[str] = None,
    location: Optional[str] = None,
) -> Dict[str, Any]:
    """Creates an event in the user's primary Google Calendar.

    Tags the event with ``extendedProperties.private`` containing ``plan_id`` and
    ``item_id`` so incremental sync can filter by plan.
    """
    access_token = await get_valid_access_token(user)

    body: Dict[str, Any] = {
        "summary": title,
        "start": {"dateTime": start.astimezone(timezone.utc).isoformat()},
        "end": {"dateTime": end.astimezone(timezone.utc).isoformat()},
    }
    if color_id:
        body["colorId"] = str(color_id)
    if description:
        body["description"] = description
    if location:
        body["location"] = location
    if private_props:
        body["extendedProperties"] = {"private": private_props}
    if reminders:
        body["reminders"] = reminders

    url = f"{CALENDAR_API_BASE}/calendars/primary/events"
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, json=body, headers=headers)
        if resp.status_code == 401:
            raise HTTPException(status_code=401, detail="Google access token expired or revoked.")
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=resp.status_code, detail=f"Google Calendar create failed: {resp.text}")
        return resp.json()


async def update_event(
    user: Dict[str, Any],
    event_id: str,
    title: Optional[str] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    color_id: Optional[str] = None,
    reminders: Optional[Dict[str, Any]] = None,
    private_props: Optional[Dict[str, str]] = None,
    description: Optional[str] = None,
    location: Optional[str] = None,
) -> Dict[str, Any]:
    """Updates an existing Google Calendar event using HTTP PATCH (partial update)."""
    access_token = await get_valid_access_token(user)

    url = f"{CALENDAR_API_BASE}/calendars/primary/events/{event_id}"
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

    body: Dict[str, Any] = {}
    if title:
        body["summary"] = title
    if start:
        body["start"] = {"dateTime": start.astimezone(timezone.utc).isoformat()}
    if end:
        body["end"] = {"dateTime": end.astimezone(timezone.utc).isoformat()}
    if color_id:
        body["colorId"] = str(color_id)
    if description is not None:
        body["description"] = description
    if location is not None:
        body["location"] = location
    if private_props:
        body["extendedProperties"] = {"private": private_props}
    if reminders:
        body["reminders"] = reminders

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.patch(url, json=body, headers=headers)
        if resp.status_code == 401:
            raise HTTPException(status_code=401, detail="Google access token expired or revoked.")
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"Google Calendar update failed: {resp.text}")
        return resp.json()


async def delete_event(user: Dict[str, Any], event_id: str) -> bool:
    """Deletes a Google Calendar event. Returns ``True`` on success or 404 (already deleted)."""
    access_token = await get_valid_access_token(user)

    url = f"{CALENDAR_API_BASE}/calendars/primary/events/{event_id}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.delete(url, headers={"Authorization": f"Bearer {access_token}"})
        if resp.status_code == 401:
            raise HTTPException(status_code=401, detail="Google access token expired or revoked.")
        if resp.status_code in (200, 204, 404):
            return True
        raise HTTPException(status_code=resp.status_code, detail=f"Google Calendar delete failed: {resp.text}")


async def sync(user: Dict[str, Any], plan: Dict[str, Any]) -> Dict[str, Any]:
    """Performs an incremental sync of Google Calendar events tagged with this plan's ID.

    Uses ``syncToken`` for incremental syncs; automatically falls back to a full sync
    when the token is invalidated (HTTP 410).

    Returns:
        ``{"updated_events": [...], "deleted_event_ids": [...], "next_sync_token": str}``
    """
    access_token = await get_valid_access_token(user)
    plan_id_str = str(plan.get("_id") or plan.get("id"))
    sync_token = plan.get("sync_token")

    url = f"{CALENDAR_API_BASE}/calendars/primary/events"
    headers = {"Authorization": f"Bearer {access_token}"}

    params: Dict[str, Any] = {"privateExtendedProperty": f"plan_id={plan_id_str}"}
    if sync_token:
        params["syncToken"] = sync_token
    else:
        params["showDeleted"] = "true"

    updated_events: List[Dict[str, Any]] = []
    deleted_ids: List[str] = []
    next_sync_token = ""
    page_token: Optional[str] = None

    async with httpx.AsyncClient(timeout=20.0) as client:
        while True:
            if page_token:
                params["pageToken"] = page_token

            resp = await client.get(url, params=params, headers=headers)

            if resp.status_code == 410:
                # syncToken expired → full re-sync
                params.pop("syncToken", None)
                params["showDeleted"] = "true"
                page_token = None
                continue
            if resp.status_code == 401:
                raise HTTPException(status_code=401, detail="Google access token expired or revoked.")
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=f"Calendar sync failed: {resp.text}")

            data = resp.json()
            for item in data.get("items", []):
                ev_id = item.get("id")
                if item.get("status") == "cancelled":
                    deleted_ids.append(ev_id)
                else:
                    updated_events.append(item)

            page_token = data.get("nextPageToken")
            next_sync_token = data.get("nextSyncToken", "")
            if not page_token:
                break

    return {
        "updated_events": updated_events,
        "deleted_event_ids": deleted_ids,
        "next_sync_token": next_sync_token,
    }


# ---------------------------------------------------------------------------
# Utility: Google Calendar web URL and standard .ics generation
# ---------------------------------------------------------------------------

def generate_google_calendar_url(
    title: str,
    start_dt: datetime,
    end_dt: Optional[datetime] = None,
    details: Optional[str] = None,
    location: Optional[str] = None,
) -> str:
    """Generates a direct "Add to Google Calendar" web URL."""
    if end_dt is None:
        end_dt = start_dt + timedelta(hours=2)

    start_str = start_dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    end_str = end_dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    params: Dict[str, str] = {
        "action": "TEMPLATE",
        "text": title,
        "dates": f"{start_str}/{end_str}",
    }
    if details:
        params["details"] = details
    if location:
        params["location"] = location

    return f"https://calendar.google.com/calendar/render?{urllib.parse.urlencode(params)}"


def _fold_ics_line(line: str) -> str:
    """Folds a single iCalendar line to comply with RFC 5545 (max 75 octets per line).

    Continuation lines are prefixed with a single space character.
    """
    encoded = line.encode("utf-8")
    if len(encoded) <= 75:
        return line

    folded_parts: List[str] = []
    while encoded:
        # Take up to 75 bytes, but don't split a multi-byte UTF-8 character
        chunk = encoded[:75]
        while len(chunk) > 0 and (chunk[-1] & 0xC0) == 0x80:
            # Last byte is a UTF-8 continuation byte — trim back one byte
            chunk = chunk[:-1]
        folded_parts.append(chunk.decode("utf-8"))
        encoded = encoded[len(chunk):]

    return "\r\n ".join(folded_parts)


def generate_ics_content(
    title: str,
    start_dt: datetime,
    end_dt: Optional[datetime] = None,
    details: Optional[str] = None,
    location: Optional[str] = None,
    uid: Optional[str] = None,
) -> str:
    """Generates RFC 5545-compliant iCalendar (.ics) file content.

    Long lines are folded at 75 octets as required by the standard.
    """
    if end_dt is None:
        end_dt = start_dt + timedelta(hours=2)

    start_str = start_dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    end_str = end_dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    dtstamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    event_uid = uid or f"{dtstamp}-{title.replace(' ', '_')}@timezy"

    raw_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Timezy Event Planner//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:{event_uid}",
        f"DTSTAMP:{dtstamp}",
        f"DTSTART:{start_str}",
        f"DTEND:{end_str}",
        f"SUMMARY:{title}",
    ]
    if details:
        clean_desc = details.replace("\n", "\\n").replace(",", "\\,")
        raw_lines.append(f"DESCRIPTION:{clean_desc}")
    if location:
        raw_lines.append(f"LOCATION:{location}")
    raw_lines.extend([
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR",
    ])

    # Fold lines per RFC 5545 §3.1
    return "\r\n".join(_fold_ics_line(line) for line in raw_lines) + "\r\n"
