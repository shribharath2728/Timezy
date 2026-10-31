import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone
from main import app
from db import get_plans_collection


@pytest.mark.asyncio
async def test_health_check():
    """Verify GET /health returns 200 with status ok."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/health")
        assert res.status_code == 200
        assert res.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_ai_assist_endpoint_success():
    """Verify POST /plans/ai-assist calls Gemini and returns assistant reply."""
    mock_reply = "### Custom Theme Ideas\n1. Starlit Garden Gala\n2. Golden Hour Vintage"
    payload = {
        "message": "Suggest theme ideas for my birthday",
        "event_details": {
            "title": "Aarav's 25th Birthday",
            "category": "birthday",
            "budget": 50000,
            "guests": 60,
            "venue": "Home terrace",
            "date": "2026-11-20",
            "commencementTime": "06:30 PM",
        },
    }
    with patch("main.ask_ai_chat", new_callable=AsyncMock) as mock_ask:
        mock_ask.return_value = mock_reply
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/plans/ai-assist", json=payload)
            assert res.status_code == 200
            data = res.json()
            assert "reply" in data
            assert "Custom Theme Ideas" in data["reply"]
            assert mock_ask.call_count == 1


@pytest.mark.asyncio
async def test_ai_assist_endpoint_fallback_on_gemini_error():
    """Verify POST /plans/ai-assist falls back to dynamic local generator when Gemini fails."""
    payload = {
        "message": "How is my plan looking?",
        "event_details": {
            "title": "Priya's Celebration",
            "category": "birthday",
            "budget": 30000,
            "guests": 40,
            "venue": "Living room",
            "date": "2026-11-25",
            "commencementTime": "05:00 PM",
        },
    }
    with patch("main.ask_ai_chat", new_callable=AsyncMock) as mock_ask:
        mock_ask.side_effect = Exception("Gemini service unavailable")
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/plans/ai-assist", json=payload)
            assert res.status_code == 200
            data = res.json()
            assert "reply" in data
            # Dynamic generator recognizes home venue and includes executive review
            assert "Executive Plan Review" in data["reply"] or "Priya" in data["reply"]


@pytest.mark.asyncio
async def test_oauth_csrf_state_validation():
    """Verify /auth/callback returns 400 when OAuth state cookie does not match query state."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Set state cookie to 'secret-state-1', but query passes 'mismatched-state'
        client.cookies.set("oauth_state", "secret-state-1")
        res = await client.get("/auth/callback?code=testcode&state=mismatched-state")
        assert res.status_code == 400
        assert "Invalid OAuth state" in res.json()["detail"]


@pytest.mark.asyncio
async def test_plan_create_validation_negative_budget():
    """Verify validation rejects budget <= 0 with 422."""
    payload = {
        "title": "Invalid Plan",
        "category": "birthday",
        "event_start": "2026-11-20T18:00:00Z",
        "budget": -100,
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/plans", json=payload)
        assert res.status_code == 422


@pytest.mark.asyncio
async def test_plan_create_validation_invalid_date():
    """Verify validation rejects invalid event_start format with 422."""
    payload = {
        "title": "Invalid Date Plan",
        "category": "birthday",
        "event_start": "not-a-date",
        "budget": 50000,
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/plans", json=payload)
        assert res.status_code == 422


@pytest.mark.asyncio
async def test_calendar_ics_download_endpoint():
    """Verify GET /plans/{id}/calendar.ics generates valid iCalendar file content."""
    plans_col = get_plans_collection()
    test_plan = {
        "title": "Gala Anniversary Dinner",
        "category": "wedding",
        "event_start": datetime.now(timezone.utc) + pytest.importorskip("datetime").timedelta(days=10),
        "tz": "Asia/Kolkata",
        "budget": 75000,
        "guests": 100,
        "location": "ITC Grand Chola",
        "status": "draft",
        "items": [
            {"id": "item-1", "item": "Florals and Lighting", "cost": 15000, "lead_days": 2, "duration_minutes": 60}
        ],
    }
    insert_res = await plans_col.insert_one(test_plan)
    plan_id = str(insert_res.inserted_id)

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get(f"/plans/{plan_id}/calendar.ics")
            assert res.status_code == 200
            assert "text/calendar" in res.headers.get("content-type", "")
            content = res.text
            assert "BEGIN:VCALENDAR" in content
            assert "END:VCALENDAR" in content
            assert "Gala Anniversary Dinner" in content
    finally:
        await plans_col.delete_one({"_id": insert_res.inserted_id})
