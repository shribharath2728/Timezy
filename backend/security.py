import os
from typing import Optional, Dict, Any
from cryptography.fernet import Fernet
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

import config

SESSION_SECRET = os.getenv("SESSION_SECRET", config.SESSION_SECRET)
TOKEN_ENC_KEY = os.getenv("TOKEN_ENC_KEY", config.TOKEN_ENC_KEY)

# Fernet instance for encrypting/decrypting sensitive refresh tokens
_fernet: Optional[Fernet] = None


def get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        key = TOKEN_ENC_KEY
        if not key:
            # Fallback for dev / tests if not provided
            key = Fernet.generate_key().decode()
        if isinstance(key, str):
            key = key.encode()
        _fernet = Fernet(key)
    return _fernet


def encrypt_token(token: str) -> str:
    """Encrypts a sensitive string (e.g. Google refresh token) using Fernet."""
    if not token:
        return ""
    f = get_fernet()
    return f.encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    """Decrypts a Fernet-encrypted token."""
    if not encrypted_token:
        return ""
    f = get_fernet()
    return f.decrypt(encrypted_token.encode()).decode()


# Serializer for signed httpOnly cookie sessions
_serializer: Optional[URLSafeTimedSerializer] = None


def get_session_serializer() -> URLSafeTimedSerializer:
    global _serializer
    if _serializer is None:
        _serializer = URLSafeTimedSerializer(SESSION_SECRET, salt="session-cookie")
    return _serializer


def create_session_cookie(data: Dict[str, Any]) -> str:
    """Creates a cryptographically signed session token for httpOnly cookie."""
    s = get_session_serializer()
    return s.dumps(data)


def decode_session_cookie(cookie_val: str, max_age: int = 14 * 86400) -> Optional[Dict[str, Any]]:
    """Decodes and validates signed session cookie. Returns None if invalid or expired."""
    if not cookie_val:
        return None
    s = get_session_serializer()
    try:
        return s.loads(cookie_val, max_age=max_age)
    except (BadSignature, SignatureExpired):
        return None
