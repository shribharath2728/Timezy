from datetime import datetime, timezone, timedelta, time
from zoneinfo import ZoneInfo
from typing import List, Dict, Any, Union, Optional, Tuple
from fastapi import HTTPException, status

DEFAULT_TIMEZONE = "Asia/Kolkata"

# Working hours in user timezone: 09:00 - 20:00
DEFAULT_WORK_START_HOUR = 9
DEFAULT_WORK_END_HOUR = 20

# Priority P1-P4 -> Google Calendar colorId and reminder overrides
# P1: email 10080 + popup 1440 + popup 120 (colorId: 11 - Red)
# P2: email 4320 + popup 1440 (colorId: 6 - Orange)
# P3: popup 1440 (colorId: 7 - Blue)
# P4: popup 0 (colorId: 8 - Gray)
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

DEFAULT_VENDOR_CHECKLISTS: Dict[str, List[Dict[str, Any]]] = {
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


def ensure_utc(dt: Union[datetime, str], tz_str: str = DEFAULT_TIMEZONE) -> datetime:
    """Converts a datetime (or ISO string) into a timezone-aware UTC datetime.
    If naive, assumes it is in the given user timezone (default Asia/Kolkata).
    """
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt)
        except ValueError:
            dt = datetime.strptime(dt, "%Y-%m-%d")

    if dt.tzinfo is None:
        user_tz = ZoneInfo(tz_str)
        dt = dt.replace(tzinfo=user_tz)

    return dt.astimezone(timezone.utc)


def to_user_timezone(dt_utc: datetime, tz_str: str = DEFAULT_TIMEZONE) -> datetime:
    """Converts a timezone-aware UTC datetime to the user's IANA timezone."""
    if dt_utc.tzinfo is None:
        dt_utc = dt_utc.replace(tzinfo=timezone.utc)
    return dt_utc.astimezone(ZoneInfo(tz_str))


def format_for_display(dt_utc: datetime, tz_str: str = DEFAULT_TIMEZONE) -> str:
    """Formats a UTC datetime in the user's timezone as an ISO string."""
    return to_user_timezone(dt_utc, tz_str).isoformat()


# ---------------------------------------------------------------------------
# Planner Validation & Free Slot Discovery (Pure Code, No AI)
# ---------------------------------------------------------------------------

def validate_event_start(event_start_utc: datetime, tz_str: str = DEFAULT_TIMEZONE, now_utc: Optional[datetime] = None) -> datetime:
    """Validate event_start >= now+1h in user tz (reject past dates). Raises 400 if invalid."""
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
    """Returns Google Calendar colorId and reminder overrides for P1-P4."""
    p = str(priority).upper()
    return PRIORITY_GCAL_CONFIG.get(p, PRIORITY_GCAL_CONFIG["P1"])


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
    """Finds free slots in working hours (default 09:00-20:00 user tz, default 30-min duration)

    using busy_blocks, never before now, never after the event.
    If target date is in the past, clamps to the next free slot.
    """
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)

    user_tz = ZoneInfo(tz_str)
    duration = timedelta(minutes=duration_minutes)

    # Convert busy_list strings into UTC datetime tuples (start, end)
    parsed_busy: List[Tuple[datetime, datetime]] = []
    if busy_list:
        for b in busy_list:
            b_start = b.get("start")
            b_end = b.get("end")
            if b_start and b_end:
                try:
                    dt_s = ensure_utc(b_start, tz_str)
                    dt_e = ensure_utc(b_end, tz_str)
                    parsed_busy.append((dt_s, dt_e))
                except Exception:
                    pass

    # Start search from target date, or now + 15m if target is in the past (clamping)
    search_start = max(target_dt_utc, now_utc + timedelta(minutes=15))

    # Iterate day by day from search_start up to event_start_utc
    curr_local = to_user_timezone(search_start, tz_str)
    event_local = to_user_timezone(event_start_utc, tz_str)

    # Limit search to 30 days or event start
    max_days = min(30, max(1, (event_local.date() - curr_local.date()).days + 1))

    for day_offset in range(max_days):
        day_date = curr_local.date() + timedelta(days=day_offset)
        if day_date > event_local.date():
            break

        # Define working hours on this day
        day_work_start_local = datetime(
            day_date.year, day_date.month, day_date.day, work_start_hour, 0, 0, tzinfo=user_tz
        )
        day_work_end_local = datetime(
            day_date.year, day_date.month, day_date.day, work_end_hour, 0, 0, tzinfo=user_tz
        )

        day_work_start_utc = day_work_start_local.astimezone(timezone.utc)
        day_work_end_utc = day_work_end_local.astimezone(timezone.utc)

        # Candidate slot start: at least search_start
        slot_candidate = max(day_work_start_utc, search_start)

        while slot_candidate + duration <= day_work_end_utc and slot_candidate + duration <= event_start_utc:
            slot_end = slot_candidate + duration

            # Check overlap with parsed_busy
            is_busy = False
            for b_s, b_e in parsed_busy:
                # Overlap condition: max(slot_candidate, b_s) < min(slot_end, b_e)
                if max(slot_candidate, b_s) < min(slot_end, b_e):
                    is_busy = True
                    # Jump forward to end of busy block
                    slot_candidate = max(slot_candidate + timedelta(minutes=15), b_e)
                    break

            if not is_busy:
                return (slot_candidate, slot_end)

    return None
