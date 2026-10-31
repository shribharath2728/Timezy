"""Single environment loader for Timezy. Import this module instead of repeating load_dotenv."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

_ENV_PATH = Path(__file__).resolve().parent / ".env"
if not _ENV_PATH.exists():
    _ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

APP_NAME = "Timezy"
DEFAULT_TIMEZONE = os.getenv("DEFAULT_TIMEZONE", "Asia/Kolkata")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
SESSION_SECRET = os.getenv("SESSION_SECRET", "default_dev_session_secret_change_in_production_32b")
TOKEN_ENC_KEY = os.getenv("TOKEN_ENC_KEY")
TICK_TOKEN_DEFAULT = "default_tick_secret_token_123"
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() in {"1", "true", "yes"}
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "event_planner_db")


def env(key: str, default: str | None = None) -> str | None:
    return os.getenv(key, default)
