"""Pure planning utilities for Timezy: timezone conversion, free-slot discovery, and defaults.

No AI calls or database access here — all functions are deterministic and independently testable.
"""

import copy
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple, Union
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status

DEFAULT_TIMEZONE = "Asia/Kolkata"

# Working hours in user timezone: 09:00 – 20:00
DEFAULT_WORK_START_HOUR = 9
DEFAULT_WORK_END_HOUR = 20

# ---------------------------------------------------------------------------
# Priority P1–P4 → Google Calendar colorId and reminder overrides
# P1: email 10080 + popup 1440 + popup 120  (colorId: 11 – Red)
# P2: email 4320 + popup 1440               (colorId:  6 – Orange)
# P3: popup 1440                            (colorId:  7 – Blue)
# P4: popup 0                              (colorId:  8 – Gray)
# ---------------------------------------------------------------------------
PRIORITY_GCAL_CONFIG: Dict[str, Dict[str, Any]] = {
    "P1": {
        "colorId": "11",
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "email", "minutes": 10080},
                {"method": "popup", "minutes": 1440},
                {"method": "popup", "minutes": 120},
            ],
        },
    },
    "P2": {
        "colorId": "6",
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "email", "minutes": 4320},
                {"method": "popup", "minutes": 1440},
            ],
        },
    },
    "P3": {
        "colorId": "7",
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "popup", "minutes": 1440},
            ],
        },
    },
    "P4": {
        "colorId": "8",
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "popup", "minutes": 0},
            ],
        },
    },
}

# Deep-copied on every access via ``get_default_checklist()`` to prevent callers from
# accidentally mutating the module-level template.
_DEFAULT_VENDOR_CHECKLISTS: Dict[str, List[Dict[str, Any]]] = {
    "birthday": [
        {"id": "b_1", "item": "Birthday cake and bakery", "cost": 5000, "lead_days": 3, "priority": "P1", "done": False},
        {"id": "b_2", "item": "Party decorations and balloons", "cost": 3000, "lead_days": 2, "priority": "P2", "done": False},
        {"id": "b_3", "item": "Catering and snacks", "cost": 15000, "lead_days": 5, "priority": "P1", "done": False},
        {"id": "b_4", "item": "Entertainment and games", "cost": 7000, "lead_days": 2, "priority": "P3", "done": False},
        {"id": "b_5", "item": "Photography and videography", "cost": 10000, "lead_days": 4, "priority": "P2", "done": False},
    ],
    "wedding": [
        {"id": "w_1", "item": "Venue and banquet hall", "cost": 100000, "lead_days": 30, "priority": "P1", "done": False},
        {"id": "w_2", "item": "Catering and beverage service", "cost": 80000, "lead_days": 14, "priority": "P1", "done": False},
        {"id": "w_3", "item": "Floral arrangements and decor", "cost": 30000, "lead_days": 7, "priority": "P2", "done": False},
        {"id": "w_4", "item": "Photography and videography", "cost": 40000, "lead_days": 14, "priority": "P2", "done": False},
        {"id": "w_5", "item": "DJ, sound, and lighting", "cost": 25000, "lead_days": 7, "priority": "P2", "done": False},
        {"id": "w_6", "item": "Invitations and stationery", "cost": 10000, "lead_days": 21, "priority": "P3", "done": False},
        {"id": "w_7", "item": "Bridal wear and styling", "cost": 35000, "lead_days": 14, "priority": "P2", "done": False},
    ],
    "meeting": [
        {"id": "m_1", "item": "Conference room / AV tech rental", "cost": 15000, "lead_days": 3, "priority": "P1", "done": False},
        {"id": "m_2", "item": "Coffee, tea, and luncheon catering", "cost": 8000, "lead_days": 2, "priority": "P2", "done": False},
        {"id": "m_3", "item": "Presentation handouts and badge printing", "cost": 3000, "lead_days": 1, "priority": "P3", "done": False},
        {"id": "m_4", "item": "Video recording and transcription", "cost": 6000, "lead_days": 2, "priority": "P3", "done": False},
    ],
    "travel": [
        {"id": "t_1", "item": "Flight and train ticket bookings", "cost": 25000, "lead_days": 14, "priority": "P1", "done": False},
        {"id": "t_2", "item": "Hotel and lodging reservation", "cost": 20000, "lead_days": 10, "priority": "P1", "done": False},
        {"id": "t_3", "item": "Local transport and car rental", "cost": 8000, "lead_days": 3, "priority": "P2", "done": False},
        {"id": "t_4", "item": "Travel insurance and permits", "cost": 4000, "lead_days": 7, "priority": "P2", "done": False},
        {"id": "t_5", "item": "Tour guide and activity passes", "cost": 6000, "lead_days": 3, "priority": "P3", "done": False},
    ],
    "community": [
        {"id": "c_1", "item": "Public venue and stage permit", "cost": 5000, "lead_days": 7, "priority": "P1", "done": False},
        {"id": "c_2", "item": "PA system and acoustic setup", "cost": 10000, "lead_days": 3, "priority": "P2", "done": False},
        {"id": "c_3", "item": "Banners, signage, and flyers", "cost": 4000, "lead_days": 4, "priority": "P3", "done": False},
        {"id": "c_4", "item": "Volunteer water and snack station", "cost": 3000, "lead_days": 2, "priority": "P3", "done": False},
        {"id": "c_5", "item": "Cleanup and waste management crew", "cost": 5000, "lead_days": 1, "priority": "P2", "done": False},
    ],
}

# Public read-only view kept for backward compatibility with existing imports.
DEFAULT_VENDOR_CHECKLISTS = _DEFAULT_VENDOR_CHECKLISTS


def get_default_checklist(category: str) -> List[Dict[str, Any]]:
    """Returns a deep copy of the default vendor checklist for *category*.

    Always returns a copy so callers cannot mutate the module-level template.
    Returns an empty list for unknown categories.
    """
    return copy.deepcopy(_DEFAULT_VENDOR_CHECKLISTS.get(category, []))


# ---------------------------------------------------------------------------
# Timezone helpers
# ---------------------------------------------------------------------------

def ensure_utc(dt: Union[datetime, str], tz_str: str = DEFAULT_TIMEZONE) -> datetime:
    """Converts a datetime or ISO string to a timezone-aware UTC datetime.

    Parsing rules:
    - If *dt* is already a ``datetime`` with tzinfo, it is converted to UTC directly.
    - If *dt* is naive, it is assumed to be in *tz_str* (default ``Asia/Kolkata``).
    - Bare date strings (e.g. ``"2026-11-15"``) are interpreted as midnight in *tz_str*.

    Args:
        dt: A ``datetime`` object or ISO-8601 string (with or without time component).
        tz_str: IANA timezone name to assume when *dt* is naive or date-only.

    Returns:
        A timezone-aware ``datetime`` normalised to UTC.
    """
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt)
        except ValueError:
            # Bare date string "YYYY-MM-DD" → midnight in user tz
            dt = datetime.strptime(dt, "%Y-%m-%d")

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo(tz_str))

    return dt.astimezone(timezone.utc)


def to_user_timezone(dt_utc: datetime, tz_str: str = DEFAULT_TIMEZONE) -> datetime:
    """Converts a timezone-aware UTC ``datetime`` to the given IANA timezone.

    Args:
        dt_utc: A UTC ``datetime`` (naive datetimes are treated as UTC).
        tz_str: Target IANA timezone name (default ``Asia/Kolkata``).

    Returns:
        A timezone-aware ``datetime`` in *tz_str*.
    """
    if dt_utc.tzinfo is None:
        dt_utc = dt_utc.replace(tzinfo=timezone.utc)
    return dt_utc.astimezone(ZoneInfo(tz_str))


def format_for_display(
    dt_utc: Optional[datetime], tz_str: str = DEFAULT_TIMEZONE
) -> Optional[str]:
    """Formats a UTC ``datetime`` as an ISO string in the user's timezone.

    Args:
        dt_utc: UTC ``datetime`` to format. Returns ``None`` when *dt_utc* is ``None``.
        tz_str: Target IANA timezone name (default ``Asia/Kolkata``).

    Returns:
        ISO-8601 string in the user's local timezone, or ``None`` if *dt_utc* is ``None``.
    """
    if dt_utc is None:
        return None
    return to_user_timezone(dt_utc, tz_str).isoformat()


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate_event_start(
    event_start_utc: datetime,
    tz_str: str = DEFAULT_TIMEZONE,
    now_utc: Optional[datetime] = None,
) -> datetime:
    """Validates that *event_start_utc* is at least 1 hour in the future.

    Args:
        event_start_utc: Proposed event start time in UTC.
        tz_str: User's IANA timezone (used only for the error message).
        now_utc: Override for current time (useful in tests). Defaults to ``datetime.now(UTC)``.

    Returns:
        *event_start_utc* unchanged when valid.

    Raises:
        HTTPException(400): When the event start is less than 1 hour in the future.
    """
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)

    minimum_allowed = now_utc + timedelta(hours=1)
    if event_start_utc < minimum_allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="event_start must be at least 1 hour into the future.",
        )
    return event_start_utc


def get_priority_config(priority: str) -> Dict[str, Any]:
    """Returns Google Calendar colorId and reminder overrides for P1–P4.

    Falls back to P1 config for unknown priority strings.
    """
    return PRIORITY_GCAL_CONFIG.get(str(priority).upper(), PRIORITY_GCAL_CONFIG["P1"])


# ---------------------------------------------------------------------------
# Free-slot discovery
# ---------------------------------------------------------------------------

def find_free_slot(
    target_dt_utc: datetime,
    event_start_utc: datetime,
    tz_str: str = DEFAULT_TIMEZONE,
    duration_minutes: int = 30,
    busy_list: Optional[List[Dict[str, str]]] = None,
    now_utc: Optional[datetime] = None,
    work_start_hour: int = DEFAULT_WORK_START_HOUR,
    work_end_hour: int = DEFAULT_WORK_END_HOUR,
) -> Optional[Tuple[datetime, datetime]]:
    """Finds the earliest free working-hours slot for a planning task.

    Searches day-by-day from *target_dt_utc* (clamped to ``now + 15 min`` when in
    the past) up to *event_start_utc*, never scheduling past the event itself.

    Args:
        target_dt_utc: Ideal start time (usually ``event_start − lead_days``).
        event_start_utc: Hard deadline — slots must end before this time.
        tz_str: User's IANA timezone used to determine working hours.
        duration_minutes: Required slot duration in minutes (default 30).
        busy_list: List of ``{"start": ISO, "end": ISO}`` dicts representing blocked times.
        now_utc: Override for current time (useful in tests).
        work_start_hour: Start of working day in user tz (default 9).
        work_end_hour: End of working day in user tz (default 20).

    Returns:
        ``(slot_start_utc, slot_end_utc)`` tuple, or ``None`` when no free slot exists
        within the search window.
    """
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)

    user_tz = ZoneInfo(tz_str)
    duration = timedelta(minutes=duration_minutes)

    # Parse busy intervals once, sorted for efficient skipping
    parsed_busy: List[Tuple[datetime, datetime]] = []
    if busy_list:
        for b in busy_list:
            b_start_str = b.get("start")
            b_end_str = b.get("end")
            if b_start_str and b_end_str:
                try:
                    parsed_busy.append((
                        ensure_utc(b_start_str, tz_str),
                        ensure_utc(b_end_str, tz_str),
                    ))
                except Exception:
                    pass
    parsed_busy.sort(key=lambda x: x[0])

    # Clamp search start to at least now + 15 min
    search_start = max(target_dt_utc, now_utc + timedelta(minutes=15))

    curr_local = to_user_timezone(search_start, tz_str)
    event_local = to_user_timezone(event_start_utc, tz_str)

    # Search up to 30 days or until event date (whichever is sooner)
    max_days = min(30, max(1, (event_local.date() - curr_local.date()).days + 1))

    for day_offset in range(max_days):
        day_date = curr_local.date() + timedelta(days=day_offset)
        if day_date > event_local.date():
            break

        day_work_start_utc = datetime(
            day_date.year, day_date.month, day_date.day,
            work_start_hour, 0, 0, tzinfo=user_tz,
        ).astimezone(timezone.utc)
        day_work_end_utc = datetime(
            day_date.year, day_date.month, day_date.day,
            work_end_hour, 0, 0, tzinfo=user_tz,
        ).astimezone(timezone.utc)

        slot_candidate = max(day_work_start_utc, search_start)

        while slot_candidate + duration <= day_work_end_utc and slot_candidate + duration <= event_start_utc:
            slot_end = slot_candidate + duration

            is_busy = False
            for b_s, b_e in parsed_busy:
                # Overlap: max(slot_start, busy_start) < min(slot_end, busy_end)
                if max(slot_candidate, b_s) < min(slot_end, b_e):
                    is_busy = True
                    # Jump to end of this busy block
                    slot_candidate = max(slot_candidate + timedelta(minutes=15), b_e)
                    break

            if not is_busy:
                return (slot_candidate, slot_end)

    return None
