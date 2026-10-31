import logging
import os
from abc import ABC, abstractmethod
from typing import Optional
import httpx

import config  # noqa: F401  # load .env once

logger = logging.getLogger(__name__)

BIRTHDAY_WISH_TEMPLATE = """Happy Birthday {name}!

Wishing you a fantastic celebration on your special day.
May your year ahead be full of joy, good health, and memorable moments!

Warm wishes,
Your Event Planner Team"""


class EmailProvider(ABC):
    """Provider-agnostic interface for sending emails."""

    @abstractmethod
    def send(self, to_email: str, subject: str, body: str, from_email: Optional[str] = None) -> bool:
        pass


class HttpEmailProvider(EmailProvider):
    """HTTP Email API provider (SendGrid, Mailgun, Resend, or custom webhook)."""

    def __init__(self):
        self.api_url = os.getenv("EMAIL_API_URL")
        self.api_key = os.getenv("EMAIL_API_KEY")

    def is_configured(self) -> bool:
        return bool(self.api_url and self.api_key)

    def send(self, to_email: str, subject: str, body: str, from_email: Optional[str] = None) -> bool:
        if not self.is_configured():
            raise RuntimeError("HTTP email API is not configured (missing EMAIL_API_URL or EMAIL_API_KEY)")

        sender = from_email or os.getenv("EMAIL_FROM", "no-reply@eventplanner.com")
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "from": sender,
            "to": [to_email],
            "subject": subject,
            "text": body,
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(self.api_url, json=payload, headers=headers)
                resp.raise_for_status()
                return True
        except Exception as e:
            raise RuntimeError(f"HTTP email provider failed: {e}") from e


class ConsoleEmailProvider(EmailProvider):
    """Fallback provider that safely logs email dispatch when no external email API is configured."""

    def send(self, to_email: str, subject: str, body: str, from_email: Optional[str] = None) -> bool:
        sender = from_email or os.getenv("EMAIL_FROM", "no-reply@eventplanner.com")
        logger.info(f"[Email Dispatch] From: {sender} | To: {to_email} | Subject: {subject}")
        return True


class EmailService(EmailProvider):
    """Dispatches via HTTP email API provider if configured, with console logger fallback."""

    def __init__(self):
        self.http_provider = HttpEmailProvider()
        self.console_provider = ConsoleEmailProvider()

    def send(self, to_email: str, subject: str, body: str, from_email: Optional[str] = None) -> bool:
        if self.http_provider.is_configured():
            return self.http_provider.send(to_email, subject, body, from_email)
        return self.console_provider.send(to_email, subject, body, from_email)


_default_mailer: EmailProvider = EmailService()


def get_mailer() -> EmailProvider:
    return _default_mailer


def set_mailer(mailer: EmailProvider):
    global _default_mailer
    _default_mailer = mailer


def send_email(to_email: str, subject: str, body: str, from_email: Optional[str] = None) -> bool:
    """Convenience functional wrapper around the configured email provider."""
    return get_mailer().send(to_email, subject, body, from_email)


def send_birthday_wish(to_email: str, name: str) -> bool:
    """Sends fixed-template birthday wish email."""
    subject = f"Happy Birthday {name}!"
    body = BIRTHDAY_WISH_TEMPLATE.format(name=name)
    return send_email(to_email=to_email, subject=subject, body=body)
