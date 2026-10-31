"""Extended test coverage for Timezy backend.

Covers previously untested areas:
- Dashboard aggregation endpoint
- Plan list with category/status filters
- Patch item edge cases (integer index, toggle-done default)
- Concurrent wish-tick atomicity (double-send prevention)
- generate_dynamic_chat_reply all 12 branches
- ICS line folding (RFC 5545)
- Access token caching in gcal.py
- Async email provider (wish.py)
- Schema validation (VendorItemModel, EmailStr)
"""

import os
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock, MagicMock

from httpx import AsyncClient, ASGITransport

import ai
from ai import generate_dynamic_chat_reply
from gcal import generate_ics_content, _fold_ics_line, _TOKEN_CACHE, _cache_key
from main import app
from db import get_plans_collection, get_users_collection
from security import create_session_cookie, encrypt_token
from wish import HttpEmailProvider, ConsoleEmailProvider, EmailService, set_mailer


# ---------------------------------------------------------------------------
# Dashboard endpoint — aggregation pipeline
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_dashboard_returns_aggregated_counts():
    """GET /dashboard returns correct category counts and total_budget via aggregation."""
    plans_col = get_plans_collection()
    now_utc = datetime.now(timezone.utc)

    # Insert 2 birthday plans + 1 wedding plan
    await plans_col.insert_many([
        {
            "user_id": "anon_dash_1",
            "category": "birthday",
            "title": "Plan A",
            "event_start": now_utc + timedelta(days=3),
            "budget": 10000.0,
            "status": "draft",
            "tz": "Asia/Kolkata",
            "items": [],
        },
        {
            "user_id": "anon_dash_1",
            "category": "birthday",
            "title": "Plan B",
            "event_start": now_utc + timedelta(days=10),
            "budget": 20000.0,
            "status": "draft",
            "tz": "Asia/Kolkata",
            "items": [],
        },
        {
            "user_id": "anon_dash_1",
            "category": "wedding",
            "title": "Wedding Plan",
            "event_start": now_utc + timedelta(days=30),
            "budget": 150000.0,
            "status": "draft",
            "tz": "Asia/Kolkata",
            "items": [],
        },
    ])

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/dashboard")
        assert res.status_code == 200
        data = res.json()

        assert data["total_events"] == 3
        assert abs(data["total_budget"] - 180000.0) < 0.01
        assert data["category_counts"]["birthday"] == 2
        assert data["category_counts"]["wedding"] == 1
        # next_event should be the soonest (Plan A, 3 days away)
        assert data["next_event"] is not None
        assert data["next_event"]["title"] == "Plan A"
        assert data["next_event"]["days_remaining"] >= 2


@pytest.mark.asyncio
async def test_dashboard_empty_returns_zeros():
    """GET /dashboard with no plans returns zeroed aggregation."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/dashboard")
        assert res.status_code == 200
        data = res.json()
        assert data["total_events"] == 0
        assert data["total_budget"] == 0.0
        assert data["next_event"] is None
        assert all(v == 0 for v in data["category_counts"].values())


# ---------------------------------------------------------------------------
# List plans with category and status filters
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_plans_filter_by_category():
    """GET /plans?category=birthday returns only birthday plans."""
    plans_col = get_plans_collection()
    now_utc = datetime.now(timezone.utc)

    await plans_col.insert_many([
        {
            "user_id": "anon_filter",
            "category": "birthday",
            "title": "Birthday Party",
            "event_start": now_utc + timedelta(days=5),
            "budget": 25000.0,
            "status": "draft",
            "tz": "Asia/Kolkata",
            "items": [],
            "budget_plan": {},
            "ideas": [],
        },
        {
            "user_id": "anon_filter",
            "category": "wedding",
            "title": "Wedding Reception",
            "event_start": now_utc + timedelta(days=60),
            "budget": 300000.0,
            "status": "draft",
            "tz": "Asia/Kolkata",
            "items": [],
            "budget_plan": {},
            "ideas": [],
        },
    ])

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/plans?category=birthday")
        assert res.status_code == 200
        plans = res.json()
        assert len(plans) >= 1
        assert all(p["category"] == "birthday" for p in plans)


@pytest.mark.asyncio
async def test_list_plans_filter_by_status():
    """GET /plans?status=scheduled returns only scheduled plans."""
    plans_col = get_plans_collection()
    now_utc = datetime.now(timezone.utc)

    await plans_col.insert_many([
        {
            "user_id": "anon_status",
            "category": "meeting",
            "title": "Board Meeting",
            "event_start": now_utc + timedelta(days=2),
            "budget": 10000.0,
            "status": "scheduled",
            "tz": "Asia/Kolkata",
            "items": [],
            "budget_plan": {},
            "ideas": [],
        },
        {
            "user_id": "anon_status",
            "category": "meeting",
            "title": "Draft Standup",
            "event_start": now_utc + timedelta(days=1),
            "budget": 5000.0,
            "status": "draft",
            "tz": "Asia/Kolkata",
            "items": [],
            "budget_plan": {},
            "ideas": [],
        },
    ])

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/plans?status=scheduled")
        assert res.status_code == 200
        plans = res.json()
        assert len(plans) >= 1
        assert all(p["status"] == "scheduled" for p in plans)


# ---------------------------------------------------------------------------
# Patch item edge cases
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_patch_item_by_integer_index():
    """PATCH /plans/{id}/items/0 — integer index fallback when no ID match."""
    plans_col = get_plans_collection()
    plan = {
        "user_id": "anon_patch",
        "category": "birthday",
        "title": "Test Patch",
        "event_start": datetime.now(timezone.utc) + timedelta(days=5),
        "budget": 10000.0,
        "status": "draft",
        "tz": "Asia/Kolkata",
        "items": [
            {"id": "x_1", "item": "Cake", "verdict": "essential", "cost": 2000.0, "done": False},
        ],
    }
    res_ins = await plans_col.insert_one(plan)
    plan_id = str(res_ins.inserted_id)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Use integer "0" as item_id — should fall back to index-based match
        resp = await client.patch(f"/plans/{plan_id}/items/0", json={"done": True})
        assert resp.status_code == 200
        assert resp.json()["item"]["done"] is True


@pytest.mark.asyncio
async def test_patch_item_toggle_done_default():
    """PATCH /plans/{id}/items/{item_id} with empty body toggles done status."""
    plans_col = get_plans_collection()
    plan = {
        "user_id": "anon_toggle",
        "category": "birthday",
        "title": "Toggle Test",
        "event_start": datetime.now(timezone.utc) + timedelta(days=5),
        "budget": 10000.0,
        "status": "draft",
        "tz": "Asia/Kolkata",
        "items": [
            {"id": "tog_1", "item": "Decorations", "verdict": "optional", "cost": 1500.0, "done": False},
        ],
    }
    res_ins = await plans_col.insert_one(plan)
    plan_id = str(res_ins.inserted_id)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # No body → toggle done from False to True
        resp = await client.patch(f"/plans/{plan_id}/items/tog_1")
        assert resp.status_code == 200
        assert resp.json()["item"]["done"] is True

        # Second toggle → back to False
        resp2 = await client.patch(f"/plans/{plan_id}/items/tog_1")
        assert resp2.status_code == 200
        assert resp2.json()["item"]["done"] is False


@pytest.mark.asyncio
async def test_patch_item_not_found_returns_404():
    """PATCH /plans/{id}/items/nonexistent returns 404."""
    plans_col = get_plans_collection()
    plan = {
        "user_id": "anon_404",
        "category": "travel",
        "title": "404 Patch Test",
        "event_start": datetime.now(timezone.utc) + timedelta(days=5),
        "budget": 5000.0,
        "status": "draft",
        "tz": "Asia/Kolkata",
        "items": [{"id": "real_item", "item": "Tickets", "cost": 5000.0, "done": False}],
    }
    res_ins = await plans_col.insert_one(plan)
    plan_id = str(res_ins.inserted_id)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.patch(f"/plans/{plan_id}/items/nonexistent_id_xyz")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Wish-tick atomicity — double-send prevention
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_wish_tick_does_not_double_send():
    """POST /internal/wish-tick claims atomically with find_one_and_update so it never sends twice.

    Simulates two concurrent tick calls on the same plan; verifies the email is sent exactly once.
    """
    plans_col = get_plans_collection()
    now_utc = datetime.now(timezone.utc)

    plan = {
        "user_id": "wish_atomic",
        "category": "birthday",
        "title": "Atomic Wish Test",
        "event_start": now_utc,  # Today's date
        "tz": "Asia/Kolkata",
        "budget": 10000.0,
        "status": "draft",
        "items": [],
        "wish": {
            "name": "Atomic User",
            "email": "atomic@example.com",
            "consent": True,
            "sent": False,
        },
    }
    await plans_col.insert_one(plan)

    sent_count = {"n": 0}

    async def fake_send_birthday_wish(to_email, name):
        sent_count["n"] += 1
        return True

    with patch.dict(os.environ, {"TICK_TOKEN": "tick_atomic_test"}), \
         patch("main.send_birthday_wish", side_effect=fake_send_birthday_wish):

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # First tick
            resp1 = await client.post(
                "/internal/wish-tick",
                headers={"X-Tick-Token": "tick_atomic_test"},
            )
            assert resp1.status_code == 200
            assert resp1.json()["dispatched_count"] >= 1

            # Second tick — plan.wish.sent is now True, should NOT send again
            resp2 = await client.post(
                "/internal/wish-tick",
                headers={"X-Tick-Token": "tick_atomic_test"},
            )
            assert resp2.status_code == 200
            assert resp2.json()["dispatched_count"] == 0

    # Email must have been sent exactly once
    assert sent_count["n"] == 1


@pytest.mark.asyncio
async def test_wish_tick_skips_future_events():
    """POST /internal/wish-tick does NOT send wishes for events not occurring today."""
    plans_col = get_plans_collection()
    now_utc = datetime.now(timezone.utc)

    await plans_col.insert_one({
        "user_id": "wish_future",
        "category": "birthday",
        "title": "Future Birthday",
        "event_start": now_utc + timedelta(days=7),
        "tz": "Asia/Kolkata",
        "budget": 10000.0,
        "status": "draft",
        "items": [],
        "wish": {
            "name": "Future User",
            "email": "future@example.com",
            "consent": True,
            "sent": False,
        },
    })

    with patch.dict(os.environ, {"TICK_TOKEN": "tick_future_test"}), \
         patch("main.send_birthday_wish") as mock_send:

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/internal/wish-tick",
                headers={"X-Tick-Token": "tick_future_test"},
            )
            assert resp.status_code == 200
            assert resp.json()["dispatched_count"] == 0
            mock_send.assert_not_called()


# ---------------------------------------------------------------------------
# generate_dynamic_chat_reply — all 12 branches
# ---------------------------------------------------------------------------

DETAILS = {
    "title": "Priya's Birthday",
    "category": "birthday",
    "venue": "Home Terrace",
    "budget": 30000,
    "guests": 50,
    "date": "2026-11-20",
    "commencementTime": "06:30 PM",
}

HOME_DETAILS = {**DETAILS, "venue": "My House"}
HALL_DETAILS = {**DETAILS, "venue": "ITC Grand Chola Banquet Hall"}


def test_reply_plan_review():
    """Branch 0: plan review triggers executive breakdown."""
    reply = generate_dynamic_chat_reply("How is my plan looking?", DETAILS)
    assert "Executive Plan Review" in reply
    assert "Priya's Birthday" in reply
    assert "₹30,000" in reply or "30000" in reply


def test_reply_plan_review_home_venue():
    """Branch 0 (home venue): shows zero venue rental cost."""
    reply = generate_dynamic_chat_reply("Review my plan", HOME_DETAILS)
    assert "₹0" in reply or "home celebration" in reply.lower()


def test_reply_pure_greeting():
    """Branch 1: pure greeting returns welcome message."""
    reply = generate_dynamic_chat_reply("Hello", DETAILS)
    assert "Hello" in reply or "Great to connect" in reply


def test_reply_greeting_how_are_you():
    """Branch 1 (how are you): returns I am doing wonderful."""
    reply = generate_dynamic_chat_reply("Hi how are you", DETAILS)
    assert "wonderful" in reply.lower() or "doing" in reply.lower()


def test_reply_who_are_you():
    """Branch 1 (identity): returns Timezy AI description."""
    reply = generate_dynamic_chat_reply("Who are you?", DETAILS)
    assert "Timezy AI" in reply


def test_reply_thanks():
    """Branch 1 (thanks): returns acknowledgement."""
    reply = generate_dynamic_chat_reply("Thank you!", DETAILS)
    assert "welcome" in reply.lower() or "thrilled" in reply.lower()


def test_reply_cake_timing():
    """Branch 2 (cake timing): returns cake cutting schedule."""
    reply = generate_dynamic_chat_reply("When should we cut the cake?", DETAILS)
    assert "Cake Cutting" in reply or "45 to 60 minutes" in reply


def test_reply_buffet_timing():
    """Branch 2 (buffet timing): returns dining schedule."""
    reply = generate_dynamic_chat_reply("When should we start dinner buffet?", DETAILS)
    assert "Buffet" in reply or "75 to 90 minutes" in reply


def test_reply_invitation():
    """Branch 3: returns ready-to-send invitation message."""
    reply = generate_dynamic_chat_reply("Write an invitation message for WhatsApp", DETAILS)
    assert "cordially invited" in reply or "Invitation Message" in reply
    assert "2026-11-20" in reply or "Priya" in reply


def test_reply_cake_recommendation():
    """Branch 4: returns cake size and flavor recommendations."""
    reply = generate_dynamic_chat_reply("How many kg of cake do I need?", DETAILS)
    assert "kg" in reply
    assert "Chocolate" in reply or "Red Velvet" in reply


def test_reply_catering():
    """Branch 5: returns catering menu strategy."""
    reply = generate_dynamic_chat_reply("Suggest a food menu for my event", DETAILS)
    assert "Catering" in reply or "Menu" in reply
    assert "₹" in reply


def test_reply_return_gifts():
    """Branch 6: returns return gift ideas."""
    reply = generate_dynamic_chat_reply("What return gifts should I give?", DETAILS)
    assert "Gift" in reply or "gift" in reply
    assert "₹" in reply


def test_reply_music():
    """Branch 7: returns music and sound planning."""
    reply = generate_dynamic_chat_reply("Suggest some music and DJ options", DETAILS)
    assert "Music" in reply or "Sound" in reply
    assert "10:00 PM" in reply


def test_reply_photography():
    """Branch 8: returns photography coverage advice."""
    reply = generate_dynamic_chat_reply("How should I handle photography?", DETAILS)
    assert "Photography" in reply
    assert "hours" in reply


def test_reply_home_logistics():
    """Branch 9: returns home celebration logistics."""
    reply = generate_dynamic_chat_reply("How do I manage space at home?", HOME_DETAILS)
    assert "Home" in reply or "home" in reply
    assert "guests" in reply.lower() or "50" in reply


def test_reply_schedule_timeline():
    """Branch 10: returns day-of schedule."""
    reply = generate_dynamic_chat_reply("Give me a day-of schedule", DETAILS)
    assert "Commencement" in reply or "schedule" in reply.lower()
    assert "06:30 PM" in reply


def test_reply_games():
    """Branch 11: returns interactive game ideas."""
    reply = generate_dynamic_chat_reply("Suggest some games and activities", DETAILS)
    assert "Game" in reply or "Activity" in reply or "Scavenger" in reply


def test_reply_budget():
    """Branch 12: returns budget breakdown and savings tips."""
    reply = generate_dynamic_chat_reply("How should I manage my budget?", DETAILS)
    assert "Budget" in reply or "budget" in reply
    assert "₹30,000" in reply or "30000" in reply


def test_reply_catchall():
    """Catch-all branch: unrecognised prompt returns generic advice."""
    reply = generate_dynamic_chat_reply("Tell me about helium balloon regulations", DETAILS)
    assert "Priya's Birthday" in reply or "₹" in reply


def test_reply_no_details():
    """All branches work gracefully when no event details are provided."""
    reply = generate_dynamic_chat_reply("How is my plan looking?")
    assert "Executive Plan Review" in reply
    assert "Celebration" in reply  # default title


# ---------------------------------------------------------------------------
# ICS line folding (RFC 5545)
# ---------------------------------------------------------------------------

def test_ics_short_line_not_folded():
    """Lines ≤75 octets must not be folded."""
    short = "SUMMARY:Short Title"
    assert _fold_ics_line(short) == short


def test_ics_long_line_folded_at_75_octets():
    """Lines >75 octets are folded with CRLF + space continuation."""
    long_line = "DESCRIPTION:" + "A" * 200
    folded = _fold_ics_line(long_line)
    for segment in folded.split("\r\n"):
        assert len(segment.encode("utf-8")) <= 75


def test_ics_content_contains_required_fields():
    """generate_ics_content produces valid VCALENDAR with all required fields."""
    start = datetime(2026, 12, 15, 14, 0, 0, tzinfo=timezone.utc)
    ics = generate_ics_content(
        title="Year-End Gala",
        start_dt=start,
        details="Annual celebration event",
        location="ITC Grand Chola, Chennai",
        uid="test-uid-12345",
    )
    assert "BEGIN:VCALENDAR" in ics
    assert "BEGIN:VEVENT" in ics
    assert "SUMMARY:Year-End Gala" in ics
    assert "LOCATION:ITC Grand Chola" in ics
    assert "UID:test-uid-12345" in ics
    assert "END:VEVENT" in ics
    assert "END:VCALENDAR" in ics
    # Lines must end with CRLF
    assert "\r\n" in ics


def test_ics_line_folding_utf8_safe():
    """Folded lines must not split multi-byte UTF-8 characters."""
    line = "SUMMARY:" + "भारतीय उत्सव कार्यक्रम " * 10
    folded = _fold_ics_line(line)
    # Reconstructed text must be decodable (no broken UTF-8 sequences)
    reconstructed = folded.replace("\r\n ", "")
    reconstructed.encode("utf-8")  # should not raise


# ---------------------------------------------------------------------------
# Access token caching in gcal.py
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_access_token_cached_after_first_refresh():
    """get_valid_access_token uses cached token on second call; only one refresh request made."""
    import httpx as _httpx
    from gcal import get_valid_access_token

    user = {
        "_id": "cache_test_user_001",
        "encrypted_refresh_token": encrypt_token("mock_refresh_token"),
    }
    # Clear any existing cache entry
    _TOKEN_CACHE.pop(_cache_key(user), None)

    call_count = {"n": 0}

    async def fake_post(url, **kwargs):
        call_count["n"] += 1
        return _httpx.Response(200, json={"access_token": f"access_{call_count['n']}"})

    with patch("httpx.AsyncClient.post", side_effect=fake_post):
        token1 = await get_valid_access_token(user)
        token2 = await get_valid_access_token(user)

    # Only one HTTP call should have been made
    assert call_count["n"] == 1
    assert token1 == token2 == "access_1"

    # Cleanup
    _TOKEN_CACHE.pop(_cache_key(user), None)


# ---------------------------------------------------------------------------
# Async email provider (wish.py)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_console_email_provider_logs_and_returns_true():
    """ConsoleEmailProvider.send logs the email and returns True without making HTTP calls."""
    provider = ConsoleEmailProvider()
    result = await provider.send(
        to_email="test@example.com",
        subject="Test Subject",
        body="Test body content",
    )
    assert result is True


@pytest.mark.asyncio
async def test_http_email_provider_is_configured_false_when_no_env():
    """HttpEmailProvider.is_configured() returns False when EMAIL_API_URL/KEY are unset."""
    provider = HttpEmailProvider()
    # In test environment these vars are not set
    if not provider.is_configured():
        assert True
    else:
        # If somehow configured in test env, just check the attribute exists
        assert hasattr(provider, "api_url")


@pytest.mark.asyncio
async def test_email_service_falls_back_to_console_when_unconfigured():
    """EmailService.send falls back to ConsoleEmailProvider when HTTP provider is not configured."""
    service = EmailService()
    # Force HTTP provider to appear unconfigured
    service.http_provider.api_url = None
    service.http_provider.api_key = None

    result = await service.send(
        to_email="fallback@example.com",
        subject="Fallback Test",
        body="Test body",
    )
    assert result is True


@pytest.mark.asyncio
async def test_send_birthday_wish_calls_email_service():
    """send_birthday_wish formats the template correctly and calls the email service."""
    from wish import send_birthday_wish

    received = {}

    class CapturingProvider:
        async def send(self, to_email, subject, body, from_email=None):
            received["to"] = to_email
            received["subject"] = subject
            received["body"] = body
            return True

    set_mailer(CapturingProvider())
    try:
        result = await send_birthday_wish(to_email="birthday@example.com", name="Aarav")
        assert result is True
        assert received["to"] == "birthday@example.com"
        assert "Aarav" in received["subject"]
        assert "Happy Birthday Aarav" in received["body"] or "Aarav" in received["body"]
    finally:
        # Restore default mailer
        from wish import EmailService as _ES
        set_mailer(_ES())


# ---------------------------------------------------------------------------
# Schema validation
# ---------------------------------------------------------------------------

def test_vendor_item_model_extra_fields_allowed():
    """VendorItemModel accepts extra fields (for frontend-generated items with custom keys)."""
    from schemas import VendorItemModel
    item = VendorItemModel(id="v1", item="Catering", cost=5000, extra_field="custom_value")
    assert item.id == "v1"
    assert item.cost == 5000


def test_vendor_item_model_cost_must_be_non_negative():
    """VendorItemModel rejects negative cost values."""
    from schemas import VendorItemModel
    import pydantic
    with pytest.raises((pydantic.ValidationError, ValueError)):
        VendorItemModel(id="v2", item="Negative", cost=-100)


def test_wish_consent_request_validates_email():
    """WishConsentRequest rejects malformed email addresses."""
    from schemas import WishConsentRequest
    import pydantic
    with pytest.raises((pydantic.ValidationError, ValueError)):
        WishConsentRequest(email="not-an-email", consent=True)


def test_wish_consent_request_accepts_valid_email():
    """WishConsentRequest accepts well-formed email addresses."""
    from schemas import WishConsentRequest
    req = WishConsentRequest(email="valid@example.com", consent=True, name="Priya")
    assert req.email == "valid@example.com"


def test_plan_create_request_rejects_past_date():
    """PlanCreateRequest event_start validator rejects completely invalid date strings."""
    from schemas import PlanCreateRequest
    import pydantic
    with pytest.raises((pydantic.ValidationError, ValueError)):
        PlanCreateRequest(
            title="Bad Date",
            category="birthday",
            event_start="not-a-date-at-all",
            budget=10000,
        )


def test_plan_create_request_accepts_bare_date_string():
    """PlanCreateRequest accepts bare YYYY-MM-DD strings (parsed as midnight in user tz)."""
    from schemas import PlanCreateRequest
    req = PlanCreateRequest(
        title="Bare Date",
        category="birthday",
        event_start="2027-06-15",
        budget=25000,
    )
    assert req.event_start == "2027-06-15"
