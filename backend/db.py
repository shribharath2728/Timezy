import os
import asyncio
from typing import Optional, Dict, Any
from pymongo import AsyncMongoClient, ASCENDING, IndexModel

import config

MONGODB_URI = os.getenv("MONGODB_URI", config.MONGODB_URI)
DB_NAME = os.getenv("DB_NAME", config.DB_NAME)

CATEGORIES = ("birthday", "wedding", "meeting", "travel", "community")
PLAN_STATUSES = ("draft", "scheduled")

_clients: dict = {}


def get_client() -> AsyncMongoClient:
    """Returns loop-bound AsyncMongoClient (PyMongo >= 4.9, NOT Motor)."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    client = _clients.get(loop)
    if client is None:
        client = AsyncMongoClient(MONGODB_URI, tz_aware=True)
        _clients[loop] = client
    return client


def get_db():
    client = get_client()
    return client[DB_NAME]


def get_users_collection():
    """Users collection: google_id, email, tz, encrypted refresh token, created_at."""
    return get_db()["users"]


def get_plans_collection():
    """Plans collection:

    user_id, category, title, event_start UTC, tz, guests, budget, location, notes,
    status draft|scheduled, items[], budget_plan, ideas, calendar_event_ids, sync_token,
    wish{name,email,consent,sent}.
    """
    return get_db()["plans"]


async def init_db():
    """Initializes indexes on users and plans collections."""
    db = get_db()
    users_col = db["users"]
    plans_col = db["plans"]

    # 1. users: unique index on google_id and index on email
    await users_col.create_index(
        [("google_id", ASCENDING)],
        unique=True,
        sparse=True,
        name="users_google_id_unique_idx",
    )
    await users_col.create_index(
        [("email", ASCENDING)],
        name="users_email_idx",
    )

    # 2. plans: index on user_id, category, event_start, and status
    await plans_col.create_index(
        [("user_id", ASCENDING), ("event_start", ASCENDING)],
        name="plans_user_event_start_idx",
    )
    await plans_col.create_index(
        [("category", ASCENDING), ("event_start", ASCENDING)],
        name="plans_category_event_start_idx",
    )
    await plans_col.create_index(
        [("status", ASCENDING)],
        name="plans_status_idx",
    )
    await plans_col.create_index(
        [("wish.consent", ASCENDING), ("wish.sent", ASCENDING)],
        name="plans_wish_consent_sent_idx",
    )
    await plans_col.create_index(
        [("created_at", ASCENDING)],
        name="plans_created_at_idx",
    )


async def close_db():
    global _clients
    for client in list(_clients.values()):
        try:
            await client.close()
        except Exception:
            pass
    _clients.clear()
