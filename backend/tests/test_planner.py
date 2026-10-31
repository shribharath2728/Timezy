import pytest
import os
from unittest.mock import patch, AsyncMock
from fastapi import HTTPException
from httpx import AsyncClient, ASGITransport
import ai
from planner import ensure_utc, to_user_timezone, DEFAULT_VENDOR_CHECKLISTS
from gcal import generate_google_calendar_url, generate_ics_content
from datetime import datetime, timezone, timedelta
from security import encrypt_token, decrypt_token, create_session_cookie, decode_session_cookie
from main import app
from db import get_users_collection, get_plans_collection


@pytest.mark.asyncio
async def test_get_plan_good_sum():
    """Verify get_plan returns valid JSON when sum(items) + buffer == total."""
    mock_response = (
        '{"items": [{"item": "Venue", "cost": 600}, {"item": "Catering", "cost": 300}], '
        '"buffer": 100, "total": 1000}'
    )
    with patch.object(ai, "ask_ai", new_callable=AsyncMock) as mock_ask:
        mock_ask.return_value = mock_response
        plan = await ai.get_plan("Plan a party", total=1000)

        assert plan["total"] == 1000
        assert plan["buffer"] == 100
        assert sum(item["cost"] for item in plan["items"]) + plan["buffer"] == 1000
        assert mock_ask.call_count == 1


@pytest.mark.asyncio
async def test_get_plan_bad_sum_then_good():
    """Verify get_plan retries once if first response has bad sum, then succeeds on good response."""
    bad_response = (
        '{"items": [{"item": "Venue", "cost": 500}, {"item": "Catering", "cost": 300}], '
        '"buffer": 100, "total": 1000}'
    )
    good_response = (
        '{"items": [{"item": "Venue", "cost": 600}, {"item": "Catering", "cost": 300}], '
        '"buffer": 100, "total": 1000}'
    )
    with patch.object(ai, "ask_ai", new_callable=AsyncMock) as mock_ask:
        mock_ask.side_effect = [bad_response, good_response]
        plan = await ai.get_plan("Plan a party", total=1000)

        assert plan["total"] == 1000
        assert sum(item["cost"] for item in plan["items"]) + plan["buffer"] == 1000
        assert mock_ask.call_count == 2


@pytest.mark.asyncio
async def test_get_plan_always_bad():
    """Verify get_plan raises HTTP 502 if sum remains invalid after retry."""
    bad_response = (
        '{"items": [{"item": "Venue", "cost": 100}], "buffer": 50, "total": 1000}'
    )
    with patch.object(ai, "ask_ai", new_callable=AsyncMock) as mock_ask:
        mock_ask.side_effect = [bad_response, bad_response]
        with pytest.raises(HTTPException) as exc_info:
            await ai.get_plan("Plan a party", total=1000)

        assert exc_info.value.status_code == 502
        assert mock_ask.call_count == 2


def test_planner_vendor_checklists():
    """Verify default vendor checklists exist for all 5 categories."""
    categories = ["birthday", "wedding", "meeting", "travel", "community"]
    for cat in categories:
        assert cat in DEFAULT_VENDOR_CHECKLISTS
        assert len(DEFAULT_VENDOR_CHECKLISTS[cat]) > 0
        for vendor in DEFAULT_VENDOR_CHECKLISTS[cat]:
            assert "item" in vendor
            assert "done" in vendor


def test_planner_timezone_conversion():
    """Verify ensure_utc and to_user_timezone conversions."""
    utc_dt = ensure_utc("2026-11-15T00:00:00", "Asia/Kolkata")
    assert utc_dt.tzinfo == timezone.utc
    assert utc_dt.hour == 18
    assert utc_dt.day == 14

    local_dt = to_user_timezone(utc_dt, "Asia/Kolkata")
    assert local_dt.day == 15
    assert local_dt.hour == 0


def test_gcal_and_ics_generation():
    """Verify Google Calendar link and .ics content generation."""
    start = datetime(2026, 12, 1, 10, 0, 0, tzinfo=timezone.utc)
    url = generate_google_calendar_url(title="Design Review", start_dt=start)
    assert "calendar.google.com" in url
    assert "Design+Review" in url

    ics = generate_ics_content(title="Design Review", start_dt=start)
    assert "BEGIN:VCALENDAR" in ics
    assert "SUMMARY:Design Review" in ics
    assert "END:VCALENDAR" in ics


def test_fernet_token_encryption():
    """Verify Fernet encryption and decryption of refresh tokens."""
    token = "1//04example_google_refresh_token_xyz"
    encrypted = encrypt_token(token)
    assert encrypted != token
    decrypted = decrypt_token(encrypted)
    assert decrypted == token


def test_signed_session_cookie():
    """Verify signing and verification of httpOnly session cookies."""
    session_data = {"user_id": "6710abcd1234ef5678901234", "email": "user@example.com"}
    cookie_token = create_session_cookie(session_data)
    decoded = decode_session_cookie(cookie_token)
    assert decoded["user_id"] == "6710abcd1234ef5678901234"
    assert decoded["email"] == "user@example.com"

    # Verify invalid signature returns None
    assert decode_session_cookie("tampered_cookie_string") is None


@pytest.mark.asyncio
async def test_health_check_endpoint():
    """Verify GET /health returns 200 ok."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/health")
        assert res.status_code == 200
        assert res.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_auth_session_and_protected_me():
    """Verify POST /auth/session sets httpOnly cookie and GET /auth/me returns user data."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login_payload = {
            "google_id": "google_sub_987654",
            "email": "planner_user@example.com",
            "tz": "Asia/Kolkata",
            "refresh_token": "google_oauth_refresh_token_test",
        }
        resp = await client.post("/auth/session", json=login_payload)
        assert resp.status_code == 200
        assert "session_id" in resp.cookies
        user_id = resp.json()["user_id"]

        # Check DB user doc has encrypted refresh token
        users_col = get_users_collection()
        user_doc = await users_col.find_one({"google_id": "google_sub_987654"})
        assert user_doc is not None
        assert user_doc["encrypted_refresh_token"] is not None
        assert decrypt_token(user_doc["encrypted_refresh_token"]) == "google_oauth_refresh_token_test"

        # Call GET /auth/me with session cookie
        me_resp = await client.get("/auth/me")
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == "planner_user@example.com"
        assert me_resp.json()["id"] == user_id


@pytest.mark.asyncio
async def test_plan_creation_with_schema_fields():
    """Verify plan creation stores all required fields in plans collection:

    user_id, category, title, event_start UTC, tz, guests, budget, location, notes,
    status draft|scheduled, items[], budget_plan, ideas, calendar_event_ids, sync_token,
    wish{name,email,consent,sent}.
    """
    mock_response = (
        '{"items": ['
        '{"id": "b_1", "item": "Birthday cake", "verdict": "essential", "priority": "P1", "cost": 5000, "lead_days": 3, "duration_minutes": 30}, '
        '{"id": "b_2", "item": "Decorations", "verdict": "optional", "priority": "P2", "cost": 5000, "lead_days": 2, "duration_minutes": 30}, '
        '{"id": "b_3", "item": "Catering", "verdict": "essential", "priority": "P1", "cost": 25000, "lead_days": 5, "duration_minutes": 30}, '
        '{"id": "b_4", "item": "Entertainment", "verdict": "unnecessary", "priority": "P3", "cost": 5000, "lead_days": 2, "duration_minutes": 30}, '
        '{"id": "b_5", "item": "Photography", "verdict": "optional", "priority": "P2", "cost": 10000, "lead_days": 4, "duration_minutes": 30}'
        '], "buffer": 0, "total": 50000, "ideas": ["Live music", "Photo booth"]}'
    )
    with patch.object(ai, "ask_ai", new_callable=AsyncMock) as mock_ask:
        mock_ask.return_value = mock_response

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            plan_payload = {
                "title": "Aarav's 30th Birthday",
                "category": "birthday",
                "event_start": "2026-11-20T18:00:00",
                "budget": 50000.0,
                "tz": "Asia/Kolkata",
                "guests": 40,
                "location": "Bengaluru Club Hall",
                "notes": "Keep catering spicy",
                "status": "draft",
                "wish": {
                    "name": "Aarav",
                    "email": "aarav@example.com",
                    "consent": True,
                },
            }
            resp = await client.post("/plans", json=plan_payload)
            assert resp.status_code == 201
            plan_id = resp.json()["id"]

            # Inspect document in MongoDB plans collection
            plans_col = get_plans_collection()
            from bson import ObjectId
            doc = await plans_col.find_one({"_id": ObjectId(plan_id)})
            assert doc is not None
            assert doc["category"] == "birthday"
            assert doc["title"] == "Aarav's 30th Birthday"
            assert doc["budget"] == 50000.0
            assert doc["tz"] == "Asia/Kolkata"
            assert doc["status"] == "draft"
            assert doc["guests"] == 40
            assert doc["location"] == "Bengaluru Club Hall"
            assert doc["notes"] == "Keep catering spicy"
            assert isinstance(doc["items"], list)
            assert len(doc["items"]) > 0
            assert doc["budget_plan"]["total"] == 50000.0
            assert isinstance(doc["ideas"], list)
            assert isinstance(doc["calendar_event_ids"], list)
            assert "sync_token" in doc

            # Check wish subdocument
            assert doc["wish"]["name"] == "Aarav"
            assert doc["wish"]["email"] == "aarav@example.com"
            assert doc["wish"]["consent"] is True
            assert doc["wish"]["sent"] is False

            # Check UTC event_start datetime
            from datetime import timedelta
            assert doc["event_start"].tzinfo is not None
            assert doc["event_start"].utcoffset() == timedelta(0)


@pytest.mark.asyncio
async def test_auth_login_redirect_url():
    """Verify GET /auth/login redirects to Google OAuth with required scopes and parameters."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/auth/login", follow_redirects=False)
        assert resp.status_code == 307 or resp.status_code == 302
        redirect_url = resp.headers["location"]
        assert "accounts.google.com/o/oauth2/v2/auth" in redirect_url
        assert "access_type=offline" in redirect_url
        assert "prompt=consent" in redirect_url
        assert "calendar.events" in redirect_url
        assert "openid" in redirect_url


@pytest.mark.asyncio
async def test_auth_callback_flow():
    """Verify GET /auth/callback exchanges code, encrypts refresh_token with Fernet, sets session cookie."""
    with patch("main.exchange_code_for_tokens", new_callable=AsyncMock) as mock_exchange, \
         patch("main.fetch_user_info", new_callable=AsyncMock) as mock_user_info:

        mock_exchange.return_value = {
            "access_token": "mock_google_access_token_123",
            "refresh_token": "mock_google_refresh_token_secret_456",
        }
        mock_user_info.return_value = {
            "id": "google_oauth_sub_112233",
            "email": "oauth_user@example.com",
        }

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/auth/callback?code=mock_auth_code_xyz", follow_redirects=False)
            assert resp.status_code == 302
            assert "session_id" in resp.cookies

            # Verify in DB
            users_col = get_users_collection()
            user_doc = await users_col.find_one({"google_id": "google_oauth_sub_112233"})
            assert user_doc is not None
            assert user_doc["email"] == "oauth_user@example.com"
            assert user_doc["encrypted_refresh_token"] is not None
            # Verify refresh token is encrypted with Fernet
            assert decrypt_token(user_doc["encrypted_refresh_token"]) == "mock_google_refresh_token_secret_456"

            # Verify GET /me returns 200 with has_google_calendar True
            me_resp = await client.get("/me")
            assert me_resp.status_code == 200
            assert me_resp.json()["email"] == "oauth_user@example.com"
            assert me_resp.json()["has_google_calendar"] is True

            # Verify POST /auth/logout clears cookie and subsequent /me returns 401
            logout_resp = await client.post("/auth/logout")
            assert logout_resp.status_code == 200
            unauthed_resp = await client.get("/me")
            assert unauthed_resp.status_code == 401


@pytest.mark.asyncio
async def test_gcal_operations_and_expired_token_handling():
    """Verify gcal functions (busy_blocks, create_event, update_event, delete_event, sync)

    and verify 401 is returned when refresh token is expired or revoked.
    """
    from gcal import busy_blocks, create_event, update_event, delete_event, sync
    import httpx

    user = {
        "_id": "6710abcd1234ef5678901234",
        "encrypted_refresh_token": encrypt_token("mock_rt"),
    }

    # 1. Test expired/revoked refresh token raises 401
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_resp = httpx.Response(400, json={"error": "invalid_grant", "error_description": "Token has been expired or revoked."})
        mock_post.return_value = mock_resp

        with pytest.raises(HTTPException) as exc_info:
            await busy_blocks(user, datetime.now(timezone.utc), datetime.now(timezone.utc))
        assert exc_info.value.status_code == 401

    # 2. Test create_event tags extendedProperties.private {plan_id, item_id}
    with patch("gcal.get_valid_access_token", new_callable=AsyncMock) as mock_token, \
         patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_create_post:

        mock_token.return_value = "valid_access_token_123"
        mock_create_post.return_value = httpx.Response(201, json={"id": "gcal_event_123", "status": "confirmed"})

        now = datetime.now(timezone.utc)
        res = await create_event(
            user=user,
            title="Birthday Cake Delivery",
            start=now,
            end=now + timedelta(hours=1),
            color_id="11",
            reminders={"useDefault": False, "overrides": [{"method": "popup", "minutes": 30}]},
            private_props={"plan_id": "plan_999", "item_id": "item_1"},
        )
        assert res["id"] == "gcal_event_123"
        # Check payload sent to Google
        call_kwargs = mock_create_post.call_args[1]
        assert call_kwargs["json"]["extendedProperties"]["private"] == {"plan_id": "plan_999", "item_id": "item_1"}
        assert call_kwargs["json"]["colorId"] == "11"

    # 3. Test sync uses syncToken to pick up edits and deletions
    with patch("gcal.get_valid_access_token", new_callable=AsyncMock) as mock_token, \
         patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_sync_get:

        mock_token.return_value = "valid_access_token_123"
        mock_sync_get.return_value = httpx.Response(200, json={
            "items": [
                {"id": "event_updated_1", "status": "confirmed", "summary": "Updated Venue Time"},
                {"id": "event_cancelled_2", "status": "cancelled"},
            ],
            "nextSyncToken": "new_sync_token_abc_789",
        })

        plan = {"_id": "plan_999", "sync_token": "previous_sync_token_123"}
        sync_result = await sync(user, plan)
        assert len(sync_result["updated_events"]) == 1
        assert sync_result["updated_events"][0]["id"] == "event_updated_1"
        assert sync_result["deleted_event_ids"] == ["event_cancelled_2"]
        assert sync_result["next_sync_token"] == "new_sync_token_abc_789"


def test_validate_event_start_past_date_rejection():
    """validate event_start >= now+1h in user tz (reject past dates with 400)."""
    from planner import validate_event_start
    now_utc = datetime(2026, 11, 1, 12, 0, 0, tzinfo=timezone.utc)

    # 30 minutes in future -> rejected
    past_event = now_utc + timedelta(minutes=30)
    with pytest.raises(HTTPException) as exc_info:
        validate_event_start(past_event, tz_str="Asia/Kolkata", now_utc=now_utc)
    assert exc_info.value.status_code == 400

    # 2 hours in future -> allowed
    future_event = now_utc + timedelta(hours=2)
    validated = validate_event_start(future_event, tz_str="Asia/Kolkata", now_utc=now_utc)
    assert validated == future_event


def test_find_free_slot_clamping_and_busy_blocks():
    """target date = event_start - lead_days; if in the past, clamp to next free slot.
    Find free slots in working hours (09:00-20:00 user tz) using busy_blocks,
    never before now, never after event.
    """
    from planner import find_free_slot
    # Assume now is 2026-11-01 10:00:00 UTC (15:30 IST)
    now_utc = datetime(2026, 11, 1, 10, 0, 0, tzinfo=timezone.utc)
    # Event is 2026-11-03 12:00:00 UTC
    event_start_utc = datetime(2026, 11, 3, 12, 0, 0, tzinfo=timezone.utc)

    # 1. Target date in the past (e.g. 10 days before event -> 2026-10-24)
    past_target = event_start_utc - timedelta(days=10)
    slot = find_free_slot(
        target_dt_utc=past_target,
        event_start_utc=event_start_utc,
        tz_str="Asia/Kolkata",
        duration_minutes=30,
        busy_list=[],
        now_utc=now_utc,
    )
    assert slot is not None
    slot_start, slot_end = slot
    # Must be clamped to >= now
    assert slot_start >= now_utc
    assert slot_end <= event_start_utc

    # 2. Free slot finding around busy blocks
    # Candidate starts around 10:15 UTC. Mark 10:15 - 11:00 UTC as busy
    busy = [
        {
            "start": (now_utc + timedelta(minutes=15)).isoformat(),
            "end": (now_utc + timedelta(minutes=60)).isoformat(),
        }
    ]
    slot_with_busy = find_free_slot(
        target_dt_utc=past_target,
        event_start_utc=event_start_utc,
        tz_str="Asia/Kolkata",
        duration_minutes=30,
        busy_list=busy,
        now_utc=now_utc,
    )
    assert slot_with_busy is not None
    b_start, b_end = slot_with_busy
    # Slot start should be at or after busy block end (now + 60 min)
    assert b_start >= now_utc + timedelta(minutes=60)


def test_priority_calendar_color_and_reminder_overrides():
    """P1-P4 -> Calendar colorId and reminder overrides:
    P1 email 10080 + popup 1440 + popup 120 (colorId: 11);
    P2 email 4320 + popup 1440 (colorId: 6);
    P3 popup 1440 (colorId: 7);
    P4 popup 0 (colorId: 8).
    """
    from planner import get_priority_config

    p1 = get_priority_config("P1")
    assert p1["colorId"] == "11"
    assert len(p1["reminders"]["overrides"]) == 3
    assert {"method": "email", "minutes": 10080} in p1["reminders"]["overrides"]
    assert {"method": "popup", "minutes": 1440} in p1["reminders"]["overrides"]
    assert {"method": "popup", "minutes": 120} in p1["reminders"]["overrides"]

    p2 = get_priority_config("P2")
    assert p2["colorId"] == "6"
    assert len(p2["reminders"]["overrides"]) == 2
    assert {"method": "email", "minutes": 4320} in p2["reminders"]["overrides"]
    assert {"method": "popup", "minutes": 1440} in p2["reminders"]["overrides"]

    p3 = get_priority_config("P3")
    assert p3["colorId"] == "7"
    assert len(p3["reminders"]["overrides"]) == 1
    assert {"method": "popup", "minutes": 1440} in p3["reminders"]["overrides"]

    p4 = get_priority_config("P4")
    assert p4["colorId"] == "8"
    assert len(p4["reminders"]["overrides"]) == 1
    assert {"method": "popup", "minutes": 0} in p4["reminders"]["overrides"]


@pytest.mark.asyncio
async def test_patch_item_override_and_refine():
    """PATCH /plans/{id}/items/{item_id}: user overrides verdict ("keep anyway"),
    edits text, sets priority.
    POST /plans/{id}/refine (change, optional new_total).
    """
    plans_col = get_plans_collection()
    test_plan = {
        "user_id": "test_user_abc",
        "category": "birthday",
        "title": "Sam's Party",
        "event_start": datetime.now(timezone.utc) + timedelta(days=7),
        "tz": "Asia/Kolkata",
        "budget": 20000.0,
        "status": "draft",
        "items": [
            {
                "id": "item_1",
                "item": "Fireworks show",
                "verdict": "unnecessary",
                "priority": "P4",
                "cost": 5000.0,
                "lead_days": 1,
                "keep": False,
            },
            {
                "id": "item_2",
                "item": "Cake",
                "verdict": "essential",
                "priority": "P1",
                "cost": 3000.0,
                "lead_days": 2,
                "keep": False,
            },
        ],
        "budget_plan": {"items": [], "buffer": 12000.0, "total": 20000.0},
        "ideas": [],
        "calendar_event_ids": [],
    }
    insert_res = await plans_col.insert_one(test_plan)
    plan_id = str(insert_res.inserted_id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. User overrides item_1 ("keep anyway", edit text, set priority P2)
        patch_payload = {
            "keep": True,
            "item": "Eco-friendly Fireworks",
            "priority": "P2",
        }
        resp = await client.patch(f"/plans/{plan_id}/items/item_1", json=patch_payload)
        assert resp.status_code == 200
        patched = resp.json()["item"]
        assert patched["keep"] is True
        assert patched["item"] == "Eco-friendly Fireworks"
        assert patched["priority"] == "P2"

        # 2. Refine plan with new_total
        mock_refined_ai = (
            '{"items": ['
            '{"id": "item_1", "item": "Eco-friendly Fireworks", "verdict": "unnecessary", "priority": "P2", "cost": 5000, "lead_days": 1, "duration_minutes": 30}, '
            '{"id": "item_2", "item": "Cake", "verdict": "essential", "priority": "P1", "cost": 4000, "lead_days": 2, "duration_minutes": 30}'
            '], "buffer": 16000, "total": 25000, "ideas": ["Sparklers"]}'
        )
        with patch.object(ai, "ask_ai", new_callable=AsyncMock) as mock_ask:
            mock_ask.return_value = mock_refined_ai
            refine_resp = await client.post(
                f"/plans/{plan_id}/refine",
                json={"change": "Increase budget for better cake", "new_total": 25000.0},
            )
            assert refine_resp.status_code == 200
            ref_data = refine_resp.json()
            assert ref_data["budget"] == 25000.0


@pytest.mark.asyncio
async def test_schedule_plan_essential_optional_and_kept_unnecessary():
    """POST /plans/{id}/schedule:
    - Essential and optional items the user kept are scheduled in free future slots.
    - Unnecessary items are NEVER scheduled unless the user kept them (keep == True).
    - Plus the main event is created.
    - Status set to scheduled.
    """
    plans_col = get_plans_collection()
    users_col = get_users_collection()

    user_doc = {
        "google_id": "sched_user_123",
        "email": "sched@example.com",
        "tz": "Asia/Kolkata",
        "encrypted_refresh_token": encrypt_token("mock_sched_rt"),
    }
    u_res = await users_col.insert_one(user_doc)
    user_id = str(u_res.inserted_id)

    plan_doc = {
        "user_id": user_id,
        "category": "birthday",
        "title": "Grand Birthday Bash",
        "event_start": datetime.now(timezone.utc) + timedelta(days=5),
        "tz": "Asia/Kolkata",
        "budget": 30000.0,
        "status": "draft",
        "items": [
            {
                "id": "it_essential",
                "item": "Custom Birthday Cake",
                "verdict": "essential",
                "priority": "P1",
                "cost": 5000.0,
                "lead_days": 2,
                "keep": False,
            },
            {
                "id": "it_optional",
                "item": "Balloons and Streamers",
                "verdict": "optional",
                "priority": "P2",
                "cost": 3000.0,
                "lead_days": 1,
                "keep": False,
            },
            {
                "id": "it_unnecessary_discarded",
                "item": "Limo Service",
                "verdict": "unnecessary",
                "priority": "P4",
                "cost": 10000.0,
                "lead_days": 1,
                "keep": False,  # Not kept -> must NEVER be scheduled
            },
            {
                "id": "it_unnecessary_kept",
                "item": "Photo Booth",
                "verdict": "unnecessary",
                "priority": "P3",
                "cost": 4000.0,
                "lead_days": 1,
                "keep": True,   # Overridden ("keep anyway") -> SHOULD be scheduled
            },
        ],
        "calendar_event_ids": [],
    }
    p_res = await plans_col.insert_one(plan_doc)
    plan_id = str(p_res.inserted_id)

    created_events = []
    async def mock_create_event(user, title, start, end, color_id, reminders, private_props):
        eid = f"gcal_evt_{len(created_events) + 1}"
        created_events.append({
            "id": eid,
            "title": title,
            "color_id": color_id,
            "item_id": private_props.get("item_id"),
        })
        return {"id": eid, "status": "confirmed"}

    with patch("main.busy_blocks", new_callable=AsyncMock) as mock_busy, \
         patch("main.create_event", side_effect=mock_create_event):
        mock_busy.return_value = []

        cookie = create_session_cookie({"user_id": user_id, "email": "sched@example.com"})
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test", cookies={"session_id": cookie}) as client:
            resp = await client.post(f"/plans/{plan_id}/schedule")
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "scheduled"

            scheduled_item_ids = [e["item_id"] for e in created_events]
            # Essential item scheduled
            assert "it_essential" in scheduled_item_ids
            # Optional item scheduled
            assert "it_optional" in scheduled_item_ids
            # Unnecessary item kept scheduled
            assert "it_unnecessary_kept" in scheduled_item_ids
            # Unnecessary discarded NEVER scheduled
            assert "it_unnecessary_discarded" not in scheduled_item_ids
            # Main event scheduled
            assert "main_event" in scheduled_item_ids


@pytest.mark.asyncio
async def test_wish_consent_and_internal_tick():
    """Verify:
    1. POST /plans/{id}/wish-consent updates wish settings.
    2. POST /internal/wish-tick rejects missing or invalid X-Tick-Token with 401.
    3. POST /internal/wish-tick finds plans with consent=true, sent=false, wish email set,
       event date == today in the plan's tz; sends fixed-template birthday email via provider;
       claims atomically with find_one_and_update so it never sends twice.
    """
    plans_col = get_plans_collection()
    now_utc = datetime.now(timezone.utc)
    plan_tz = "Asia/Kolkata"

    # Plan 1: Event is today in Asia/Kolkata, consent=true, sent=false -> should send
    plan_today = {
        "user_id": "wish_user_1",
        "category": "birthday",
        "title": "Priya's Birthday",
        "event_start": now_utc,
        "tz": plan_tz,
        "budget": 10000.0,
        "status": "draft",
        "items": [],
        "wish": {
            "name": "Priya",
            "email": "priya@example.com",
            "consent": False,  # Initially false
            "sent": False,
        },
    }
    res_1 = await plans_col.insert_one(plan_today)
    plan_id_1 = str(res_1.inserted_id)

    # Plan 2: Event is in 5 days -> should NOT send
    plan_future = {
        "user_id": "wish_user_2",
        "category": "birthday",
        "title": "Rahul's Birthday",
        "event_start": now_utc + timedelta(days=5),
        "tz": plan_tz,
        "budget": 10000.0,
        "status": "draft",
        "items": [],
        "wish": {
            "name": "Rahul",
            "email": "rahul@example.com",
            "consent": True,
            "sent": False,
        },
    }
    await plans_col.insert_one(plan_future)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: User grants consent via POST /plans/{id}/wish-consent
        consent_resp = await client.post(
            f"/plans/{plan_id_1}/wish-consent",
            json={"consent": True, "email": "priya.updated@example.com", "name": "Priya Sharma"},
        )
        assert consent_resp.status_code == 200
        assert consent_resp.json()["wish"]["consent"] is True
        assert consent_resp.json()["wish"]["email"] == "priya.updated@example.com"

        # Step 2: Test tick without token -> 401
        unauthed_tick = await client.post("/internal/wish-tick")
        assert unauthed_tick.status_code == 401

        # Test tick with invalid token -> 401
        invalid_tick = await client.post(
            "/internal/wish-tick",
            headers={"X-Tick-Token": "wrong_token_xyz"},
        )
        assert invalid_tick.status_code == 401

        # Step 3: Run tick with valid TICK_TOKEN and mock email sending
        with patch.dict(os.environ, {"TICK_TOKEN": "secret_tick_123"}), \
             patch("main.send_birthday_wish") as mock_wish:
            mock_wish.return_value = True

            tick_resp = await client.post(
                "/internal/wish-tick",
                headers={"X-Tick-Token": "secret_tick_123"},
            )
            assert tick_resp.status_code == 200
            data = tick_resp.json()
            assert data["dispatched_count"] == 1
            assert data["dispatched"][0]["email"] == "priya.updated@example.com"
            assert data["dispatched"][0]["name"] == "Priya Sharma"
            mock_wish.assert_called_once_with(to_email="priya.updated@example.com", name="Priya Sharma")

            # Check DB: wish.sent is now True
            from bson import ObjectId
            updated_doc = await plans_col.find_one({"_id": ObjectId(plan_id_1)})
            assert updated_doc["wish"]["sent"] is True

            # Step 4: Run tick a SECOND time -> must not send twice (atomic find_one_and_update claim)
            mock_wish.reset_mock()
            second_tick_resp = await client.post(
                "/internal/wish-tick",
                headers={"X-Tick-Token": "secret_tick_123"},
            )
            assert second_tick_resp.status_code == 200
            second_data = second_tick_resp.json()
            assert second_data["dispatched_count"] == 0
            mock_wish.assert_not_called()


@pytest.mark.asyncio
async def test_ask_ai_gemini_endpoint_and_structure():
    """Verify ask_ai calls Gemini endpoint with Gemini request structure and parses Gemini response."""
    import httpx

    gemini_response_body = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": '{"items": [{"id": "1", "item": "Cake", "cost": 100}], "buffer": 0, "total": 100, "ideas": []}'
                        }
                    ],
                    "role": "model",
                },
                "finishReason": "STOP",
            }
        ]
    }

    mock_response = httpx.Response(
        status_code=200,
        json=gemini_response_body,
        request=httpx.Request("POST", "https://test.url"),
    )

    with patch.dict(os.environ, {"GEMINI_API_KEY": "test_gemini_key", "GEMINI_MODEL": "gemini-2.5-flash"}), \
         patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        res = await ai.ask_ai("Plan birthday")
        assert res == '{"items": [{"id": "1", "item": "Cake", "cost": 100}], "buffer": 0, "total": 100, "ideas": []}'

        assert mock_post.call_count == 1
        call_args = mock_post.call_args
        called_url = call_args[0][0]
        called_headers = call_args[1]["headers"]
        called_params = call_args[1]["params"]
        called_payload = call_args[1]["json"]

        # 1. Endpoint check
        assert "generativelanguage.googleapis.com" in called_url
        assert "v1beta/models/gemini-2.5-flash:generateContent" in called_url

        # 2. Auth / Headers check
        assert called_headers["x-goog-api-key"] == "test_gemini_key"
        assert called_headers["Content-Type"] == "application/json"
        assert called_params["key"] == "test_gemini_key"

        # 3. Full Gemini structure check
        assert "contents" in called_payload
        assert isinstance(called_payload["contents"], list)
        assert called_payload["contents"][0]["role"] == "user"
        assert called_payload["contents"][0]["parts"][0]["text"] == "Plan birthday"

        assert "system_instruction" in called_payload
        assert called_payload["system_instruction"]["parts"][0]["text"] == ai.SYSTEM_PROMPT

        assert "generationConfig" in called_payload
        assert called_payload["generationConfig"]["temperature"] == 0.3
        assert called_payload["generationConfig"]["responseMimeType"] == "application/json"


@pytest.mark.asyncio
async def test_ask_ai_missing_key():
    """Verify ask_ai raises HTTP 500 when no Gemini API key is configured."""
    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(HTTPException) as exc_info:
            await ai.ask_ai("Hello")
        assert exc_info.value.status_code == 500
        assert "GEMINI_API_KEY is not configured" in exc_info.value.detail


@pytest.mark.asyncio
async def test_ask_ai_gemini_http_error():
    """Verify ask_ai raises HTTP 502 when Gemini API returns an HTTP error."""
    import httpx

    mock_error_response = httpx.Response(
        status_code=400,
        text="Bad Request: invalid argument",
        request=httpx.Request("POST", "https://test.url"),
    )

    with patch.dict(os.environ, {"GEMINI_API_KEY": "test_key"}), \
         patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_error_response

        with pytest.raises(HTTPException) as exc_info:
            await ai.ask_ai("Plan birthday")
        assert exc_info.value.status_code == 502
        assert "Gemini API returned HTTP 400" in exc_info.value.detail





