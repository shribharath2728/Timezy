import os
import urllib.parse
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from dotenv import load_dotenv
import httpx
from fastapi import HTTPException, status
from security import decrypt_token

env_path = Path(__file__).resolve().parent / ".env"
if not env_path.exists():
    env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/callback")
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3"

# Scopes: openid, email, profile, https://www.googleapis.com/auth/calendar.events
SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/calendar.events",
]


def get_oauth_login_url(state: str) -> str:
    """Builds the Google OAuth authorization URL (authorization code flow, access_type=offline, prompt=consent)."""
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
    """Exchanges authorization code for access_token, refresh_token, and id_token."""
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
    """Refreshes and returns a valid access token using the user's Fernet-encrypted refresh token.

    Handles expired/revoked tokens by raising HTTP 401.
    """
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
            # Token revoked or expired -> 401
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Google refresh token expired or revoked. Please re-login. ({resp.text})",
            )
        data = resp.json()
        return data["access_token"]


async def fetch_user_info(access_token: str) -> Dict[str, Any]:
    """Fetches user profile (google_id, email) from Google userinfo API."""
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
# Google Calendar Operations
# ---------------------------------------------------------------------------

async def busy_blocks(user: Dict[str, Any], start: datetime, end: datetime) -> List[Dict[str, str]]:
    """Retrieves busy time blocks between start and end via events.list (singleEvents=true)."""
    access_token = await get_valid_access_token(user)

    # Format RFC3339 in UTC
    time_min = start.astimezone(timezone.utc).isoformat()
    time_max = end.astimezone(timezone.utc).isoformat()

    params = {
        "timeMin": time_min,
        "timeMax": time_max,
        "singleEvents": "true",
        "orderBy": "startTime",
    }

    url = f"{CALENDAR_API_BASE}/calendars/primary/events"
    headers = {"Authorization": f"Bearer {access_token}"}

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, params=params, headers=headers)
        if resp.status_code == 401:
            raise HTTPException(status_code=401, detail="Google access token expired or revoked.")
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"Google Calendar error: {resp.text}")

        data = resp.json()
        items = data.get("items", [])
        blocks = []
        for ev in items:
            # Filter transparent/free events if transparency is transparent
            if ev.get("transparency") == "transparent":
                continue
            ev_start = ev.get("start", {}).get("dateTime") or ev.get("start", {}).get("date")
            ev_end = ev.get("end", {}).get("dateTime") or ev.get("end", {}).get("date")
            if ev_start and ev_end:
                blocks.append({
                    "start": ev_start,
                    "end": ev_end,
                    "summary": ev.get("summary", "Busy"),
                })
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
    """Creates an event in Google Calendar, tagged with extendedProperties.private {plan_id, item_id}."""
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

    # Tag app events with extendedProperties.private {plan_id, item_id}
    if private_props:
        body["extendedProperties"] = {"private": private_props}

    # Custom reminders
    if reminders:
        body["reminders"] = reminders

    url = f"{CALENDAR_API_BASE}/calendars/primary/events"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

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
    """Updates an existing event in Google Calendar."""
    access_token = await get_valid_access_token(user)

    url = f"{CALENDAR_API_BASE}/calendars/primary/events/{event_id}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

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
    """Deletes an event from Google Calendar."""
    access_token = await get_valid_access_token(user)

    url = f"{CALENDAR_API_BASE}/calendars/primary/events/{event_id}"
    headers = {"Authorization": f"Bearer {access_token}"}

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.delete(url, headers=headers)
        if resp.status_code == 401:
            raise HTTPException(status_code=401, detail="Google access token expired or revoked.")
        if resp.status_code in (200, 204, 404):
            return True
        raise HTTPException(status_code=resp.status_code, detail=f"Google Calendar delete failed: {resp.text}")


async def sync(user: Dict[str, Any], plan: Dict[str, Any]) -> Dict[str, Any]:
    """Syncs edits and deletions made in Google Calendar using syncToken.

    Filters by private.plan_id == plan['_id'] to pick up modifications.
    Returns: { "updated_events": [...], "deleted_event_ids": [...], "next_sync_token": str }
    """
    access_token = await get_valid_access_token(user)
    plan_id_str = str(plan.get("_id") or plan.get("id"))
    sync_token = plan.get("sync_token")

    url = f"{CALENDAR_API_BASE}/calendars/primary/events"
    headers = {"Authorization": f"Bearer {access_token}"}

    params: Dict[str, Any] = {
        "privateExtendedProperty": f"plan_id={plan_id_str}",
    }

    if sync_token:
        # Incremental sync using syncToken
        params["syncToken"] = sync_token
    else:
        # Full sync: show deleted events so we have complete sync history
        params["showDeleted"] = "true"

    updated_events = []
    deleted_ids = []
    next_sync_token = ""

    page_token = None

    async with httpx.AsyncClient(timeout=20.0) as client:
        while True:
            if page_token:
                params["pageToken"] = page_token

            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code == 410:
                # Sync token expired / invalidated -> perform full re-sync
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
# Utility exports for web URL and .ics generation
# ---------------------------------------------------------------------------

def generate_google_calendar_url(
    title: str,
    start_dt: datetime,
    end_dt: Optional[datetime] = None,
    details: Optional[str] = None,
    location: Optional[str] = None,
) -> str:
    """Generates a direct add-to-Google-Calendar web URL."""
    if end_dt is None:
        end_dt = start_dt + timedelta(hours=2)

    start_str = start_dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    end_str = end_dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    params = {
        "action": "TEMPLATE",
        "text": title,
        "dates": f"{start_str}/{end_str}",
    }
    if details:
        params["details"] = details
    if location:
        params["location"] = location

    return f"https://calendar.google.com/calendar/render?{urllib.parse.urlencode(params)}"


def generate_ics_content(
    title: str,
    start_dt: datetime,
    end_dt: Optional[datetime] = None,
    details: Optional[str] = None,
    location: Optional[str] = None,
    uid: Optional[str] = None,
) -> str:
    """Generates standard iCalendar (.ics) format file content."""
    if end_dt is None:
        end_dt = start_dt + timedelta(hours=2)

    start_str = start_dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    end_str = end_dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    dtstamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    event_uid = uid or f"{dtstamp}-{title.replace(' ', '_')}@eventplanner"

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Event Planner AI//EN",
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
        lines.append(f"DESCRIPTION:{clean_desc}")
    if location:
        lines.append(f"LOCATION:{location}")
    lines.extend([
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR",
    ])
    return "\r\n".join(lines) + "\r\n"
