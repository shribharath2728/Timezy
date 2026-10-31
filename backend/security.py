"""Security utilities for Timezy: Fernet token encryption and signed session cookies.

Startup validation emits clear warnings when production-critical env vars are missing,
preventing silent fallback to weak default secrets.
"""

import logging
import os
from typing import Optional, Dict, Any

from cryptography.fernet import Fernet, MultiFernet
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

import config

logger = logging.getLogger(__name__)

SESSION_SECRET: str = os.getenv("SESSION_SECRET", config.SESSION_SECRET)
TOKEN_ENC_KEY: Optional[str] = os.getenv("TOKEN_ENC_KEY", config.TOKEN_ENC_KEY)

# Warn loudly at import time when running with weak defaults.
_DEFAULT_SESSION = "default_dev_session_secret_change_in_production_32b"
if SESSION_SECRET == _DEFAULT_SESSION:
    logger.warning(
        "SESSION_SECRET is using the insecure default value. "
        "Set SESSION_SECRET in your environment for production deployments."
    )

if not TOKEN_ENC_KEY:
    logger.warning(
        "TOKEN_ENC_KEY is not set. Refresh tokens will be encrypted with an ephemeral key "
        "that changes on every process restart, making all stored tokens permanently unreadable. "
        "Set TOKEN_ENC_KEY in your environment for production deployments."
    )

# ---------------------------------------------------------------------------
# Fernet encryption (refresh tokens)
# ---------------------------------------------------------------------------

_fernet: Optional[Fernet] = None


def get_fernet() -> Fernet:
    """Returns the Fernet instance, creating it from TOKEN_ENC_KEY on first use.

    Falls back to an ephemeral random key in development (emits a warning).
    MultiFernet can be adopted here for key rotation without changing the interface.
    """
    global _fernet
    if _fernet is None:
        key = TOKEN_ENC_KEY
        if not key:
            # Dev/test fallback: ephemeral key — tokens lost on restart.
            key = Fernet.generate_key().decode()
            logger.debug("Using ephemeral Fernet key (TOKEN_ENC_KEY not set).")
        if isinstance(key, str):
            key = key.encode()
        _fernet = Fernet(key)
    return _fernet


def encrypt_token(token: str) -> str:
    """Encrypts a sensitive string (e.g. Google refresh token) using Fernet symmetric encryption."""
    if not token:
        return ""
    return get_fernet().encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    """Decrypts a Fernet-encrypted token. Raises ``cryptography.fernet.InvalidToken`` on failure."""
    if not encrypted_token:
        return ""
    return get_fernet().decrypt(encrypted_token.encode()).decode()


# ---------------------------------------------------------------------------
# Signed session cookies (itsdangerous)
# ---------------------------------------------------------------------------

_serializer: Optional[URLSafeTimedSerializer] = None


def get_session_serializer() -> URLSafeTimedSerializer:
    """Returns the URLSafeTimedSerializer instance used for signing httpOnly session cookies."""
    global _serializer
    if _serializer is None:
        _serializer = URLSafeTimedSerializer(SESSION_SECRET, salt="session-cookie")
    return _serializer


def create_session_cookie(data: Dict[str, Any]) -> str:
    """Creates a cryptographically signed, time-stamped session token for use in an httpOnly cookie."""
    return get_session_serializer().dumps(data)


def decode_session_cookie(
    cookie_val: str, max_age: int = 14 * 86400
) -> Optional[Dict[str, Any]]:
    """Decodes and validates a signed session cookie.

    Returns ``None`` if the signature is invalid or the cookie has expired.
    ``max_age`` defaults to 14 days (in seconds).
    """
    if not cookie_val:
        return None
    try:
        return get_session_serializer().loads(cookie_val, max_age=max_age)
    except (BadSignature, SignatureExpired):
        return None
