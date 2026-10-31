"""MongoDB connection and index management for Timezy.

Uses PyMongo's native async client (pymongo >= 4.9, NOT Motor).
A single module-level client is re-used across all requests; the loop-based
key is kept for test isolation where a new event loop is created per test.
"""

import asyncio
import os
from typing import Optional

from pymongo import AsyncMongoClient, ASCENDING

import config

MONGODB_URI: str = os.getenv("MONGODB_URI", config.MONGODB_URI)
DB_NAME: str = os.getenv("DB_NAME", config.DB_NAME)

CATEGORIES = ("birthday", "wedding", "meeting", "travel", "community")
PLAN_STATUSES = ("draft", "scheduled")

# Loop-keyed dict so each asyncio event loop (e.g. per-test) gets its own client.
_clients: dict = {}


def get_client() -> AsyncMongoClient:
    """Returns a loop-bound ``AsyncMongoClient``, creating one per event loop if needed."""
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
    """Returns the configured MongoDB database instance."""
    return get_client()[DB_NAME]


def get_users_collection():
    """Users collection: google_id, email, tz, encrypted_refresh_token, created_at, updated_at."""
    return get_db()["users"]


def get_plans_collection():
    """Plans collection.

    Fields: user_id, category, title, event_start (UTC), tz, guests, budget, location,
    notes, status (draft|scheduled), items[], budget_plan, ideas, calendar_event_ids,
    sync_token, wish{name, email, consent, sent}, created_at, updated_at.
    """
    return get_db()["plans"]


async def init_db() -> None:
    """Creates indexes on users and plans collections.

    Safe to call multiple times — MongoDB silently skips existing indexes.
    """
    db = get_db()
    users_col = db["users"]
    plans_col = db["plans"]

    # ---- users indexes ----
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

    # ---- plans indexes ----
    # Primary list query: user_id + category + status (compound covers all filter combos)
    await plans_col.create_index(
        [("user_id", ASCENDING), ("category", ASCENDING), ("status", ASCENDING)],
        name="plans_user_category_status_idx",
    )
    # Dashboard next-event query: upcoming events sorted by start time
    await plans_col.create_index(
        [("user_id", ASCENDING), ("event_start", ASCENDING)],
        name="plans_user_event_start_idx",
    )
    # Category-level time ordering (used without user filter for community/public views)
    await plans_col.create_index(
        [("category", ASCENDING), ("event_start", ASCENDING)],
        name="plans_category_event_start_idx",
    )
    # Status-only filter
    await plans_col.create_index(
        [("status", ASCENDING)],
        name="plans_status_idx",
    )
    # Wish-tick query: consent + sent + email (covers the full wish-tick candidate query)
    await plans_col.create_index(
        [("wish.consent", ASCENDING), ("wish.sent", ASCENDING), ("wish.email", ASCENDING)],
        name="plans_wish_consent_sent_email_idx",
    )
    # Chronological creation order for pagination
    await plans_col.create_index(
        [("created_at", ASCENDING)],
        name="plans_created_at_idx",
    )


async def close_db() -> None:
    """Closes all active MongoDB client connections."""
    global _clients
    for client in list(_clients.values()):
        try:
            await client.close()
        except Exception:
            pass
    _clients.clear()
