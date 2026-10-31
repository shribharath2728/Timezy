"""Single environment loader for Timezy.

Import this module first in any backend file to ensure ``.env`` is loaded
before ``os.getenv()`` calls in other modules.

⚠️  Security note: the default values for ``SESSION_SECRET`` and ``TICK_TOKEN_DEFAULT``
are intentionally weak placeholders. Always override them via environment variables
in any non-development deployment. ``security.py`` emits startup warnings when the
defaults are detected.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

_ENV_PATH = Path(__file__).resolve().parent / ".env"
if not _ENV_PATH.exists():
    _ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

APP_NAME = "Timezy"
DEFAULT_TIMEZONE: str = os.getenv("DEFAULT_TIMEZONE", "Asia/Kolkata")
FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

# ⚠️  Override SESSION_SECRET in production — this default is publicly known.
SESSION_SECRET: str = os.getenv(
    "SESSION_SECRET",
    "default_dev_session_secret_change_in_production_32b",
)

# TOKEN_ENC_KEY must be a valid 32-byte URL-safe base64-encoded Fernet key.
# If unset, security.py falls back to an ephemeral per-process key (tokens lost on restart).
TOKEN_ENC_KEY: str | None = os.getenv("TOKEN_ENC_KEY")

# ⚠️  Override TICK_TOKEN in production — this default is publicly known.
TICK_TOKEN_DEFAULT = "default_tick_secret_token_123"

COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "false").lower() in {"1", "true", "yes"}
MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME: str = os.getenv("DB_NAME", "event_planner_db")
