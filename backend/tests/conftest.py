import os
import pytest
from db import init_db, close_db, get_db

TEST_DB_NAME = "test_event_planner_db"


@pytest.fixture(autouse=True)
async def use_test_db(monkeypatch):
    """Overrides DB_NAME to use a dedicated test database."""
    monkeypatch.setenv("DB_NAME", TEST_DB_NAME)
    await init_db()
    db = get_db()
    # Clean up test collections before each test run
    await db["users"].delete_many({})
    await db["plans"].delete_many({})

    yield

    # Clean up test collections after test run
    await db["users"].delete_many({})
    await db["plans"].delete_many({})
    await close_db()
