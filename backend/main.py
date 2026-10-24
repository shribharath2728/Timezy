import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from enum import Enum
from pathlib import Path
from typing import Optional, List, Dict, Any

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request, Response, status, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from db import (
    init_db,
    close_db,
    get_users_collection,
    get_plans_collection,
    CATEGORIES,
    PLAN_STATUSES,
)
from ai import get_plan, analyze_and_plan
from planner import (
    DEFAULT_VENDOR_CHECKLISTS,
    DEFAULT_TIMEZONE,
    ensure_utc,
    to_user_timezone,
    format_for_display,
    validate_event_start,
    find_free_slot,
    get_priority_config,
)
from wish import send_birthday_wish
from gcal import (
    generate_google_calendar_url,
    generate_ics_content,
    get_oauth_login_url,
    exchange_code_for_tokens,
    fetch_user_info,
    busy_blocks,
    create_event,
    update_event,
    delete_event,
    sync,
)
from security import (
    encrypt_token,
    decrypt_token,
    create_session_cookie,
    decode_session_cookie,
)
import secrets
from fastapi.responses import RedirectResponse


# Load .env from backend/ or root directory
env_path = Path(__file__).resolve().parent / ".env"
if not env_path.exists():
    env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize PyMongo native async database indexes (users & plans)
    await init_db()
    yield
    await close_db()


class CategoryEnum(str, Enum):
    birthday = "birthday"
    wedding = "wedding"
    meeting = "meeting"
    travel = "travel"
    community = "community"


class PlanStatusEnum(str, Enum):
    draft = "draft"
    scheduled = "scheduled"


app = FastAPI(title="Event Planner & Budget API", lifespan=lifespan)

# CORS strictly limited to FRONTEND_ORIGIN with credentials
allowed_origins = [origin.strip() for origin in FRONTEND_ORIGIN.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Session & Auth Helpers (Signed httpOnly Cookie Sessions)
# ---------------------------------------------------------------------------

COOKIE_NAME = "session_id"


async def get_current_user(request: Request) -> Optional[Dict[str, Any]]:
    """Extracts and verifies signed httpOnly session cookie to retrieve user."""
    cookie_val = request.cookies.get(COOKIE_NAME)
    if not cookie_val:
        return None

    session_data = decode_session_cookie(cookie_val)
    if not session_data or "user_id" not in session_data:
        return None

    users_col = get_users_collection()
    try:
        user_id = ObjectId(session_data["user_id"])
        user = await users_col.find_one({"_id": user_id})
        return user
    except Exception:
        return None


def serialize_doc(doc: Dict[str, Any], user_tz: Optional[str] = None) -> Dict[str, Any]:
    """Helper to convert MongoDB _id and UTC datetimes to JSON-serializable types."""
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


def parse_id(id_val: str) -> Any:
    """Supports both MongoDB ObjectId and string IDs."""
    try:
        return ObjectId(id_val)
    except Exception:
        return id_val


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class WishConfig(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    consent: Optional[bool] = False
    sent: Optional[bool] = False


class WishConsentRequest(BaseModel):
    consent: Optional[bool] = True
    email: Optional[str] = None
    name: Optional[str] = None


class PlanCreateRequest(BaseModel):
    title: str = Field(..., min_length=1)
    category: CategoryEnum
    event_start: str = Field(..., description="Event start datetime (ISO string)")
    budget: float = Field(..., gt=0)
    tz: Optional[str] = Field(default=DEFAULT_TIMEZONE, description="User IANA timezone")
    guests: Optional[int] = Field(default=0, ge=0)
    location: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[PlanStatusEnum] = PlanStatusEnum.draft
    wish: Optional[WishConfig] = None
    user_items: Optional[List[Dict[str, Any]]] = None

    @field_validator("event_start")
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        try:
            try:
                datetime.fromisoformat(v)
            except ValueError:
                datetime.strptime(v, "%Y-%m-%d")
            return v
        except Exception:
            raise ValueError(
                "event_start must be a valid ISO format string (e.g. 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM:SS')"
            )


class ItemPatchRequest(BaseModel):
    verdict: Optional[str] = None
    keep: Optional[bool] = None  # User override ("keep anyway")
    item: Optional[str] = None   # Edit text
    title: Optional[str] = None  # Alias for edit text
    priority: Optional[str] = None  # P1-P4
    cost: Optional[float] = None
    lead_days: Optional[int] = None
    done: Optional[bool] = None


class PlanRefineRequest(BaseModel):
    change: str = Field(..., min_length=1)
    new_total: Optional[float] = Field(None, gt=0)
    new_budget: Optional[float] = Field(None, gt=0)


class SessionLoginRequest(BaseModel):
    google_id: str
    email: str
    tz: Optional[str] = DEFAULT_TIMEZONE
    refresh_token: Optional[str] = None


# ---------------------------------------------------------------------------
# Auth / Google OAuth Routes (Authorization Code Flow)
# ---------------------------------------------------------------------------

@app.get("/auth/login")
def auth_login(redirect_url: Optional[str] = Query(None)):
    """Initiates Google OAuth (authorization code flow, access_type=offline, prompt=consent).

    Redirects user to Google OAuth consent screen.
    """
    state_token = secrets.token_urlsafe(16)
    auth_url = get_oauth_login_url(state=state_token)
    return RedirectResponse(url=auth_url)


@app.get("/auth/callback")
async def auth_callback(code: str = Query(...), state: Optional[str] = Query(None), response: Response = None):
    """Exchanges authorization code for tokens, encrypts refresh_token with Fernet,

    saves user in users collection, and sets signed httpOnly cookie.
    """
    token_data = await exchange_code_for_tokens(code)
    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")

    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to retrieve access token from Google",
        )

    # Fetch user profile
    user_info = await fetch_user_info(access_token)
    google_id = user_info.get("id") or user_info.get("sub")
    email = user_info.get("email")

    if not google_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google profile did not provide id or email",
        )

    users_col = get_users_collection()
    now_utc = datetime.now(timezone.utc)
    user = await users_col.find_one({"google_id": google_id})

    # Encrypt refresh token with Fernet before saving (never expose to browser)
    encrypted_rt = encrypt_token(refresh_token) if refresh_token else None

    if user:
        update_data = {
            "email": email,
            "updated_at": now_utc,
        }
        if encrypted_rt:
            update_data["encrypted_refresh_token"] = encrypted_rt
        await users_col.update_one({"_id": user["_id"]}, {"$set": update_data})
        user_id = str(user["_id"])
    else:
        new_user = {
            "google_id": google_id,
            "email": email,
            "tz": DEFAULT_TIMEZONE,
            "encrypted_refresh_token": encrypted_rt,
            "created_at": now_utc,
            "updated_at": now_utc,
        }
        res = await users_col.insert_one(new_user)
        user_id = str(res.inserted_id)

    # Set signed httpOnly cookie
    cookie_token = create_session_cookie({"user_id": user_id, "email": email})
    
    redirect_target = f"{FRONTEND_ORIGIN}/"
    res_redirect = RedirectResponse(url=redirect_target, status_code=status.HTTP_302_FOUND)
    res_redirect.set_cookie(
        key=COOKIE_NAME,
        value=cookie_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=14 * 86400,
    )
    return res_redirect


@app.post("/auth/session")
async def create_session(payload: SessionLoginRequest, response: Response):
    """Direct session creation for development, testing, or token exchange."""
    users_col = get_users_collection()
    encrypted_rt = encrypt_token(payload.refresh_token) if payload.refresh_token else None

    user = await users_col.find_one({"google_id": payload.google_id})
    now_utc = datetime.now(timezone.utc)

    if user:
        update_data = {
            "email": payload.email,
            "tz": payload.tz or user.get("tz", DEFAULT_TIMEZONE),
            "updated_at": now_utc,
        }
        if encrypted_rt:
            update_data["encrypted_refresh_token"] = encrypted_rt
        await users_col.update_one({"_id": user["_id"]}, {"$set": update_data})
        user_id = str(user["_id"])
    else:
        new_user = {
            "google_id": payload.google_id,
            "email": payload.email,
            "tz": payload.tz or DEFAULT_TIMEZONE,
            "encrypted_refresh_token": encrypted_rt,
            "created_at": now_utc,
            "updated_at": now_utc,
        }
        res = await users_col.insert_one(new_user)
        user_id = str(res.inserted_id)

    cookie_token = create_session_cookie({"user_id": user_id, "email": payload.email})
    response.set_cookie(
        key=COOKIE_NAME,
        value=cookie_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=14 * 86400,
    )
    return {"status": "ok", "user_id": user_id, "email": payload.email}


@app.post("/auth/logout")
def logout(response: Response):
    """Clears the signed httpOnly session cookie."""
    response.delete_cookie(COOKIE_NAME)
    return {"status": "ok"}


@app.get("/me")
@app.get("/auth/me")
async def get_me(user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    """Returns current authenticated user info. If expired or unauthenticated, returns 401."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please log in.",
        )
    return {
        "id": str(user["_id"]),
        "google_id": user.get("google_id"),
        "email": user.get("email"),
        "tz": user.get("tz", DEFAULT_TIMEZONE),
        "has_google_calendar": bool(user.get("encrypted_refresh_token")),
    }


# ---------------------------------------------------------------------------
# Calendar API Endpoints (busy_blocks, create_event, update, delete, sync)
# ---------------------------------------------------------------------------

@app.get("/calendar/busy")
async def get_busy_blocks(
    start: str = Query(...),
    end: str = Query(...),
    user: Optional[Dict[str, Any]] = Depends(get_current_user),
):
    """Returns busy blocks for the authenticated user between start and end."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required to view calendar busy blocks")
    start_dt = ensure_utc(start, user.get("tz", DEFAULT_TIMEZONE))
    end_dt = ensure_utc(end, user.get("tz", DEFAULT_TIMEZONE))
    return await busy_blocks(user, start_dt, end_dt)


@app.post("/plans/{plan_id}/sync")
async def sync_plan_calendar(
    plan_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_current_user),
):
    """Performs incremental calendar sync using syncToken for the specified plan."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required to sync calendar")

    plans_col = get_plans_collection()
    search_id = parse_id(plan_id)
    plan_doc = await plans_col.find_one({"$or": [{"_id": search_id}, {"id": search_id}]})
    if not plan_doc:
        raise HTTPException(status_code=404, detail="Plan not found")

    sync_result = await sync(user, plan_doc)

    # Save next_sync_token
    if sync_result.get("next_sync_token"):
        await plans_col.update_one(
            {"_id": plan_doc["_id"]},
            {"$set": {"sync_token": sync_result["next_sync_token"]}},
        )

    return sync_result


# ---------------------------------------------------------------------------
# Wish Consent & Birthday Wish Tick Endpoints (No AI here)
# ---------------------------------------------------------------------------

@app.post("/events/{plan_id}/wish-consent")
@app.post("/plans/{plan_id}/wish-consent")
async def update_wish_consent(
    plan_id: str,
    payload: Optional[WishConsentRequest] = None,
    user: Optional[Dict[str, Any]] = Depends(get_current_user),
):
    """POST /plans/{id}/wish-consent: user toggles or sets wish consent, email, and name."""
    plans_col = get_plans_collection()
    search_id = parse_id(plan_id)
    plan_doc = await plans_col.find_one({"$or": [{"_id": search_id}, {"id": search_id}]})
    if not plan_doc:
        raise HTTPException(status_code=404, detail="Plan not found")

    current_wish = plan_doc.get("wish") or {}
    new_consent = payload.consent if (payload and payload.consent is not None) else not current_wish.get("consent", False)
    new_email = (payload.email if (payload and payload.email is not None) else current_wish.get("email"))
    new_name = (payload.name if (payload and payload.name is not None) else current_wish.get("name"))

    updated_wish = {
        "name": new_name,
        "email": new_email,
        "consent": bool(new_consent),
        "sent": current_wish.get("sent", False),
    }

    await plans_col.update_one(
        {"_id": plan_doc["_id"]},
        {"$set": {"wish": updated_wish}},
    )

    return {
        "plan_id": str(plan_doc["_id"]),
        "wish": updated_wish,
    }


@app.post("/internal/wish-tick")
async def trigger_wish_tick(
    x_tick_token: Optional[str] = Header(None, alias="X-Tick-Token"),
):
    """POST /internal/wish-tick (header X-Tick-Token == TICK_TOKEN):

    find plans with consent=true, sent=false, wish email set, event date == today in the plan's tz;
    send a fixed-template birthday email via an email API provider (SMTP fallback);
    claim atomically with find_one_and_update so it never sends twice. No AI here.
    """
    configured_token = os.getenv("TICK_TOKEN", "default_tick_secret_token_123")
    if not x_tick_token or x_tick_token != configured_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Tick-Token header.",
        )

    plans_col = get_plans_collection()
    now_utc = datetime.now(timezone.utc)

    # Find candidates with consent=True, sent=False, and non-empty email
    query = {
        "wish.consent": True,
        "wish.sent": False,
        "wish.email": {"$exists": True, "$nin": [None, ""]},
    }

    cursor = plans_col.find(query)
    candidate_plans = await cursor.to_list(length=500)

    dispatched = []
    failed = []

    for plan in candidate_plans:
        plan_tz = plan.get("tz", DEFAULT_TIMEZONE)
        event_start = plan.get("event_start")
        if not event_start:
            continue

        event_start_utc = ensure_utc(event_start, plan_tz) if isinstance(event_start, str) else event_start
        # Event date in the plan's tz
        event_local_date = to_user_timezone(event_start_utc, plan_tz).date()
        # Today in the plan's tz
        today_local_date = to_user_timezone(now_utc, plan_tz).date()

        if event_local_date != today_local_date:
            continue

        # Claim atomically with find_one_and_update so it never sends twice
        claimed_doc = await plans_col.find_one_and_update(
            {
                "_id": plan["_id"],
                "wish.consent": True,
                "wish.sent": False,
            },
            {
                "$set": {
                    "wish.sent": True,
                    "wish.sent_at": now_utc,
                }
            },
            return_document=False,  # Returns doc before update
        )

        if not claimed_doc:
            # Another concurrent tick already claimed and sent this wish
            continue

        wish_info = claimed_doc.get("wish", {})
        recipient_email = wish_info.get("email")
        recipient_name = wish_info.get("name") or claimed_doc.get("title") or "Friend"

        try:
            # Send fixed-template birthday email via email API provider (SMTP fallback)
            send_birthday_wish(to_email=recipient_email, name=recipient_name)
            dispatched.append({
                "plan_id": str(claimed_doc["_id"]),
                "email": recipient_email,
                "name": recipient_name,
            })
        except Exception as e:
            # Revert wish.sent if email failed completely so it can be retried on next tick
            await plans_col.update_one(
                {"_id": claimed_doc["_id"]},
                {"$set": {"wish.sent": False, "wish.last_error": str(e)}},
            )
            failed.append({
                "plan_id": str(claimed_doc["_id"]),
                "email": recipient_email,
                "error": str(e),
            })

    return {
        "status": "ok",
        "dispatched_count": len(dispatched),
        "dispatched": dispatched,
        "failed_count": len(failed),
        "failed": failed,
    }



# ---------------------------------------------------------------------------
# Dashboard Route
# ---------------------------------------------------------------------------

@app.get("/dashboard")
async def get_dashboard(user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    """Returns aggregated summary data for dashboard screens."""
    plans_col = get_plans_collection()
    now_utc = datetime.now(timezone.utc)

    query: Dict[str, Any] = {}
    if user:
        query["user_id"] = str(user["_id"])

    category_counts = {cat: 0 for cat in CATEGORIES}
    plans_cursor = plans_col.find(query)
    plans = await plans_cursor.to_list(length=500)

    total_budget = 0.0
    future_plans = []

    for p in plans:
        cat = p.get("category")
        if cat in category_counts:
            category_counts[cat] += 1
        total_budget += float(p.get("budget", 0.0))

        start_dt = p.get("event_start")
        if start_dt:
            start_dt_utc = ensure_utc(start_dt) if isinstance(start_dt, str) else start_dt
            if start_dt_utc >= now_utc:
                future_plans.append((start_dt_utc, p))

    next_event = None
    if future_plans:
        future_plans.sort(key=lambda x: x[0])
        earliest_dt, earliest_plan = future_plans[0]
        user_tz = earliest_plan.get("tz", DEFAULT_TIMEZONE)
        next_event = serialize_doc(earliest_plan, user_tz)
        seconds_diff = int((earliest_dt - now_utc).total_seconds())
        next_event["seconds_remaining"] = max(0, seconds_diff)
        next_event["days_remaining"] = seconds_diff // 86400
        next_event["hours_remaining"] = (seconds_diff % 86400) // 3600

    return {
        "total_events": len(plans),
        "total_budget": round(total_budget, 2),
        "category_counts": category_counts,
        "next_event": next_event,
        "upcoming_reminders": [],
    }


# ---------------------------------------------------------------------------
# Plans Routes (matching schema: user_id, category, title, event_start UTC,
# tz, guests, budget, location, notes, status draft|scheduled, items[],
# budget_plan, ideas, calendar_event_ids, sync_token, wish{name,email,consent,sent})
# ---------------------------------------------------------------------------

@app.post("/events", status_code=status.HTTP_201_CREATED)
@app.post("/plans", status_code=status.HTTP_201_CREATED)
async def create_plan(
    payload: PlanCreateRequest,
    user: Optional[Dict[str, Any]] = Depends(get_current_user),
):
    """POST /plans: body = event details + user_items.
    Runs AI analysis, saves a DRAFT plan, schedules nothing yet.
    """
    category_val = payload.category.value
    user_tz = payload.tz or (user.get("tz") if user else DEFAULT_TIMEZONE)
    user_id = str(user["_id"]) if user else "anonymous"

    # 1. Validate event_start >= now + 1h
    event_start_utc = ensure_utc(payload.event_start, user_tz)
    validate_event_start(event_start_utc, user_tz)

    # 2. Determine items to classify
    raw_items = payload.user_items
    if not raw_items:
        # Fall back to default checklist for category
        raw_items = [dict(v) for v in DEFAULT_VENDOR_CHECKLISTS.get(category_val, [])]
    else:
        # Ensure all items have an id
        cleaned = []
        for idx, it in enumerate(raw_items):
            item_copy = dict(it)
            if not item_copy.get("id"):
                item_copy["id"] = f"item_{idx + 1}"
            cleaned.append(item_copy)
        raw_items = cleaned

    # 3. Runs AI analysis
    event_details = {
        "title": payload.title,
        "category": category_val,
        "guests": payload.guests or 0,
        "location": payload.location or "",
        "notes": payload.notes or "",
        "event_start": format_for_display(event_start_utc, user_tz),
    }

    ai_result = await analyze_and_plan(
        event_details=event_details,
        user_items=raw_items,
        total=payload.budget,
    )

    # Merge AI verdicts back into items
    ai_items = ai_result.get("items", [])
    ai_item_map = {str(i.get("id")): i for i in ai_items}

    merged_items = []
    for it in raw_items:
        iid = str(it.get("id"))
        ai_info = ai_item_map.get(iid, {})
        merged_item = {
            "id": iid,
            "item": it.get("item") or it.get("title") or ai_info.get("item") or "",
            "verdict": ai_info.get("verdict", "optional"),
            "priority": ai_info.get("priority") or it.get("priority", "P2"),
            "cost": float(ai_info.get("cost", it.get("cost", 0))),
            "lead_days": int(ai_info.get("lead_days", it.get("lead_days", 3))),
            "duration_minutes": int(ai_info.get("duration_minutes", 30)),
            "done": bool(it.get("done", False)),
            "keep": False,  # User override ("keep anyway")
        }
        merged_items.append(merged_item)

    wish_data = {
        "name": payload.wish.name if payload.wish else None,
        "email": payload.wish.email if payload.wish else None,
        "consent": bool(payload.wish.consent) if payload.wish else False,
        "sent": False,
    }

    plan_doc = {
        "user_id": user_id,
        "category": category_val,
        "title": payload.title,
        "event_start": event_start_utc,
        "tz": user_tz,
        "guests": payload.guests or 0,
        "budget": payload.budget,
        "location": payload.location or "",
        "notes": payload.notes or "",
        "status": "draft",  # saves a DRAFT plan, schedules nothing yet
        "items": merged_items,
        "budget_plan": ai_result,
        "ideas": ai_result.get("ideas", []),
        "calendar_event_ids": [],
        "sync_token": "",
        "wish": wish_data,
        "created_at": datetime.now(timezone.utc),
    }

    plans_col = get_plans_collection()
    insert_result = await plans_col.insert_one(plan_doc)
    plan_doc["_id"] = insert_result.inserted_id

    response_data = serialize_doc(plan_doc, user_tz)
    response_data["plan"] = {
        "items": ai_result.get("items", []),
        "buffer": ai_result.get("buffer", 0),
        "total": ai_result.get("total", payload.budget),
        "vendors": merged_items,
        "ideas": ai_result.get("ideas", []),
    }
    response_data["reminders"] = []
    response_data["date"] = format_for_display(event_start_utc, user_tz)
    return response_data


@app.get("/events")
@app.get("/plans")
async def list_plans(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: Optional[Dict[str, Any]] = Depends(get_current_user),
):
    plans_col = get_plans_collection()
    query: Dict[str, Any] = {}
    if user:
        query["user_id"] = str(user["_id"])
    if category:
        query["category"] = category
    if status:
        query["status"] = status

    cursor = plans_col.find(query).sort("_id", -1)
    plan_docs = await cursor.to_list(length=200)

    results = []
    for doc in plan_docs:
        tz = doc.get("tz", DEFAULT_TIMEZONE)
        serialized = serialize_doc(doc, tz)
        serialized["date"] = format_for_display(doc.get("event_start"), tz) if doc.get("event_start") else None
        serialized["plan"] = {
            "items": doc.get("budget_plan", {}).get("items", []),
            "buffer": doc.get("budget_plan", {}).get("buffer", 0),
            "total": doc.get("budget_plan", {}).get("total", doc.get("budget", 0)),
            "vendors": doc.get("items", []),
            "ideas": doc.get("ideas", []),
        }
        serialized["reminders"] = []
        results.append(serialized)

    return results


@app.get("/events/{event_id}")
@app.get("/plans/{event_id}")
async def get_plan_by_id(
    event_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_current_user),
):
    plans_col = get_plans_collection()
    search_id = parse_id(event_id)
    doc = await plans_col.find_one({"$or": [{"_id": search_id}, {"id": search_id}]})
    if not doc:
        raise HTTPException(status_code=404, detail="Plan not found")

    tz = doc.get("tz", DEFAULT_TIMEZONE)
    serialized = serialize_doc(doc, tz)
    serialized["date"] = format_for_display(doc.get("event_start"), tz) if doc.get("event_start") else None
    serialized["plan"] = {
        "items": doc.get("budget_plan", {}).get("items", []),
        "buffer": doc.get("budget_plan", {}).get("buffer", 0),
        "total": doc.get("budget_plan", {}).get("total", doc.get("budget", 0)),
        "vendors": doc.get("items", []),
        "ideas": doc.get("ideas", []),
    }
    serialized["reminders"] = []

    # Google Calendar link
    ev_start = doc.get("event_start")
    if ev_start:
        serialized["gcal_url"] = generate_google_calendar_url(
            title=doc.get("title", "Event"),
            start_dt=ev_start if isinstance(ev_start, datetime) else ensure_utc(ev_start),
            details=f"Category: {doc.get('category')}. Budget: {doc.get('budget')}",
            location=doc.get("location"),
        )

    return serialized


@app.get("/events/{event_id}/calendar.ics")
@app.get("/plans/{event_id}/calendar.ics")
async def get_plan_ics(event_id: str):
    """Download standard .ics file for calendar import."""
    plans_col = get_plans_collection()
    search_id = parse_id(event_id)
    doc = await plans_col.find_one({"$or": [{"_id": search_id}, {"id": search_id}]})
    if not doc:
        raise HTTPException(status_code=404, detail="Plan not found")

    ev_start = doc.get("event_start")
    start_dt = ev_start if isinstance(ev_start, datetime) else ensure_utc(ev_start)
    ics_text = generate_ics_content(
        title=doc.get("title", "Event"),
        start_dt=start_dt,
        details=f"Category: {doc.get('category')}. Budget: {doc.get('budget')}",
        location=doc.get("location"),
        uid=str(doc["_id"]),
    )
    return Response(content=ics_text, media_type="text/calendar")


@app.post("/events/{event_id}/refine")
@app.post("/plans/{event_id}/refine")
async def refine_plan_endpoint(event_id: str, payload: PlanRefineRequest):
    """POST /plans/{id}/refine (change, optional new_total)."""
    plans_col = get_plans_collection()
    search_id = parse_id(event_id)
    doc = await plans_col.find_one({"$or": [{"_id": search_id}, {"id": search_id}]})
    if not doc:
        raise HTTPException(status_code=404, detail="Plan not found")

    current_budget_plan = doc.get("budget_plan", {})
    target_budget = (
        payload.new_total
        if payload.new_total is not None
        else (
            payload.new_budget
            if payload.new_budget is not None
            else doc.get("budget", current_budget_plan.get("total", 0))
        )
    )

    # Re-analyze with existing items and refinement change
    existing_items = doc.get("items", [])
    event_details = {
        "title": doc.get("title"),
        "category": doc.get("category"),
        "guests": doc.get("guests", 0),
        "location": doc.get("location", ""),
        "notes": f"{doc.get('notes', '')} Refinement request: {payload.change}",
        "event_start": format_for_display(doc.get("event_start"), doc.get("tz", DEFAULT_TIMEZONE)),
    }

    try:
        new_ai_plan = await analyze_and_plan(
            event_details=event_details,
            user_items=existing_items,
            total=target_budget,
        )
    except Exception:
        # Fall back to get_plan if items structure varies
        refine_msg = (
            f"Event: {doc['title']}. Refinement: {payload.change}. Target total: {target_budget}."
        )
        new_ai_plan = await get_plan(refine_msg, total=target_budget)

    # Update item properties from new plan
    ai_item_map = {str(i.get("id")): i for i in new_ai_plan.get("items", [])}
    for item in existing_items:
        iid = str(item.get("id"))
        if iid in ai_item_map:
            ai_info = ai_item_map[iid]
            if "verdict" in ai_info and not item.get("keep"):
                item["verdict"] = ai_info["verdict"]
            if "cost" in ai_info:
                item["cost"] = float(ai_info["cost"])
            if "priority" in ai_info:
                item["priority"] = ai_info["priority"]

    await plans_col.update_one(
        {"_id": doc["_id"]},
        {"$set": {
            "budget": target_budget,
            "budget_plan": new_ai_plan,
            "items": existing_items,
            "ideas": new_ai_plan.get("ideas", doc.get("ideas", [])),
        }},
    )

    doc["budget"] = target_budget
    doc["budget_plan"] = new_ai_plan
    doc["items"] = existing_items
    tz = doc.get("tz", DEFAULT_TIMEZONE)
    serialized = serialize_doc(doc, tz)
    serialized["plan"] = {
        "items": new_ai_plan.get("items", []),
        "buffer": new_ai_plan.get("buffer", 0),
        "total": new_ai_plan.get("total", target_budget),
        "vendors": existing_items,
        "ideas": new_ai_plan.get("ideas", []),
    }
    serialized["reminders"] = []
    return serialized


@app.patch("/events/{event_id}/vendors/{item_id}")
@app.patch("/plans/{event_id}/items/{item_id}")
async def patch_plan_item(
    event_id: str,
    item_id: str,
    payload: Optional[ItemPatchRequest] = None,
):
    """PATCH /plans/{id}/items/{item_id}: user overrides verdict ("keep anyway"),

    edits text, sets priority, or toggles done status.
    Supports either integer index or item ID string.
    """
    plans_col = get_plans_collection()
    search_id = parse_id(event_id)
    doc = await plans_col.find_one({"$or": [{"_id": search_id}, {"id": search_id}]})
    if not doc:
        raise HTTPException(status_code=404, detail="Plan not found")

    items = doc.get("items", [])
    matched_idx = -1

    # Try matching by item id or str(id)
    for idx, it in enumerate(items):
        if str(it.get("id")) == str(item_id):
            matched_idx = idx
            break

    # If not matched, try matching by integer index
    if matched_idx == -1:
        try:
            int_idx = int(item_id)
            if 0 <= int_idx < len(items):
                matched_idx = int_idx
        except ValueError:
            pass

    if matched_idx == -1:
        raise HTTPException(status_code=404, detail=f"Item {item_id} not found in plan")

    target_item = items[matched_idx]

    if payload is not None:
        if payload.verdict is not None:
            target_item["verdict"] = payload.verdict
        if payload.keep is not None:
            target_item["keep"] = payload.keep
        if payload.item is not None:
            target_item["item"] = payload.item
        elif payload.title is not None:
            target_item["item"] = payload.title
        if payload.priority is not None:
            target_item["priority"] = payload.priority.upper()
        if payload.cost is not None:
            target_item["cost"] = payload.cost
        if payload.lead_days is not None:
            target_item["lead_days"] = payload.lead_days
        if payload.done is not None:
            target_item["done"] = payload.done
    else:
        # Default behavior: toggle done
        target_item["done"] = not target_item.get("done", False)

    await plans_col.update_one(
        {"_id": doc["_id"]},
        {"$set": {"items": items}},
    )

    return {
        "event_id": str(doc["_id"]),
        "item_id": item_id,
        "item": target_item,
        "items": items,
        "vendors": items,
    }


@app.post("/events/{event_id}/schedule")
@app.post("/plans/{event_id}/schedule")
async def schedule_plan(
    event_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_current_user),
):
    """POST /plans/{id}/schedule: for every essential and optional item the user kept,

    create Google Calendar events in free future slots, plus the main event;
    store event ids; set status scheduled.
    Unnecessary items are never scheduled unless the user kept them.
    """
    plans_col = get_plans_collection()
    search_id = parse_id(event_id)
    doc = await plans_col.find_one({"$or": [{"_id": search_id}, {"id": search_id}]})
    if not doc:
        raise HTTPException(status_code=404, detail="Plan not found")

    user_tz = doc.get("tz", DEFAULT_TIMEZONE)
    event_start_utc = doc.get("event_start")
    if isinstance(event_start_utc, str):
        event_start_utc = ensure_utc(event_start_utc, user_tz)

    now_utc = datetime.now(timezone.utc)
    # Check if user has Google Calendar enabled
    user_with_token = user
    if not user_with_token and doc.get("user_id") and doc.get("user_id") != "anonymous":
        users_col = get_users_collection()
        user_with_token = await users_col.find_one({"_id": parse_id(doc["user_id"])})

    calendar_event_ids = list(doc.get("calendar_event_ids", []))
    items = doc.get("items", [])

    # Fetch busy blocks if authenticated with Google Calendar
    busy_list = []
    if user_with_token and user_with_token.get("encrypted_refresh_token"):
        try:
            busy_list = await busy_blocks(user_with_token, now_utc, event_start_utc)
        except Exception:
            busy_list = []

    # 1. Schedule items
    # Condition: for every essential and optional item the user kept (or kept via user override)
    # Unnecessary items are never scheduled unless the user kept them (item.get("keep") is True)
    for it in items:
        verdict = str(it.get("verdict", "")).lower()
        kept = bool(it.get("keep", False))

        should_schedule = False
        if verdict == "unnecessary":
            should_schedule = kept  # Never scheduled unless user kept them
        elif verdict in ("essential", "optional"):
            should_schedule = True  # Kept items

        if not should_schedule:
            continue

        lead_days = int(it.get("lead_days", 1))
        duration_minutes = int(it.get("duration_minutes", 30))
        target_dt_utc = event_start_utc - timedelta(days=lead_days)

        slot = find_free_slot(
            target_dt_utc=target_dt_utc,
            event_start_utc=event_start_utc,
            tz_str=user_tz,
            duration_minutes=duration_minutes,
            busy_list=busy_list,
            now_utc=now_utc,
        )

        slot_start, slot_end = slot if slot else (
            max(now_utc + timedelta(hours=1), target_dt_utc),
            max(now_utc + timedelta(hours=1), target_dt_utc) + timedelta(minutes=duration_minutes),
        )

        p_cfg = get_priority_config(it.get("priority", "P2"))

        if user_with_token and user_with_token.get("encrypted_refresh_token"):
            try:
                gcal_event = await create_event(
                    user=user_with_token,
                    title=f"[{doc.get('title')}] {it.get('item', 'Task')}",
                    start=slot_start,
                    end=slot_end,
                    color_id=p_cfg["colorId"],
                    reminders=p_cfg["reminders"],
                    private_props={"plan_id": str(doc["_id"]), "item_id": str(it.get("id"))},
                )
                if gcal_event and "id" in gcal_event:
                    eid = gcal_event["id"]
                    calendar_event_ids.append(eid)
                    it["calendar_event_id"] = eid
                    # Add newly created slot to busy_list to prevent collision
                    busy_list.append({
                        "start": slot_start.isoformat(),
                        "end": slot_end.isoformat(),
                    })
            except Exception:
                pass

        it["scheduled_start"] = slot_start.isoformat()
        it["scheduled_end"] = slot_end.isoformat()

    # 2. Schedule the main event
    main_event_id = None
    if user_with_token and user_with_token.get("encrypted_refresh_token"):
        try:
            main_event_end = event_start_utc + timedelta(hours=3)
            p1_cfg = get_priority_config("P1")
            main_gcal = await create_event(
                user=user_with_token,
                title=doc.get("title", "Main Event"),
                start=event_start_utc,
                end=main_event_end,
                color_id=p1_cfg["colorId"],
                reminders=p1_cfg["reminders"],
                private_props={"plan_id": str(doc["_id"]), "item_id": "main_event"},
            )
            if main_gcal and "id" in main_gcal:
                main_event_id = main_gcal["id"]
                calendar_event_ids.append(main_event_id)
        except Exception:
            pass

    # 3. Store event ids and set status scheduled
    await plans_col.update_one(
        {"_id": doc["_id"]},
        {"$set": {
            "status": "scheduled",
            "items": items,
            "calendar_event_ids": calendar_event_ids,
        }},
    )

    doc["status"] = "scheduled"
    doc["items"] = items
    doc["calendar_event_ids"] = calendar_event_ids

    serialized = serialize_doc(doc, user_tz)
    serialized["scheduled"] = True
    serialized["calendar_event_ids"] = calendar_event_ids
    return serialized

