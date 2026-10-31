"""Email delivery service for Timezy birthday/event wish notifications.

Provides an async-safe HTTP email provider and a console fallback.
The ``send_birthday_wish`` coroutine is the main entry point called from route handlers.
"""

import asyncio
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
    async def send(
        self, to_email: str, subject: str, body: str, from_email: Optional[str] = None
    ) -> bool:
        """Send an email and return True on success, raise RuntimeError on failure."""


class HttpEmailProvider(EmailProvider):
    """Async HTTP Email API provider (SendGrid, Mailgun, Resend, or custom webhook).

    Uses ``httpx.AsyncClient`` so it never blocks the event loop.
    """

    def __init__(self) -> None:
        self.api_url = os.getenv("EMAIL_API_URL")
        self.api_key = os.getenv("EMAIL_API_KEY")

    def is_configured(self) -> bool:
        """Returns True when both EMAIL_API_URL and EMAIL_API_KEY are set."""
        return bool(self.api_url and self.api_key)

    async def send(
        self, to_email: str, subject: str, body: str, from_email: Optional[str] = None
    ) -> bool:
        if not self.is_configured():
            raise RuntimeError(
                "HTTP email API is not configured (missing EMAIL_API_URL or EMAIL_API_KEY)"
            )

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
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(self.api_url, json=payload, headers=headers)
                resp.raise_for_status()
                return True
        except Exception as exc:
            raise RuntimeError(f"HTTP email provider failed: {exc}") from exc


class ConsoleEmailProvider(EmailProvider):
    """Fallback provider that safely logs email dispatch when no external API is configured."""

    async def send(
        self, to_email: str, subject: str, body: str, from_email: Optional[str] = None
    ) -> bool:
        sender = from_email or os.getenv("EMAIL_FROM", "no-reply@eventplanner.com")
        logger.info(
            "[Email Dispatch] From: %s | To: %s | Subject: %s", sender, to_email, subject
        )
        return True


class EmailService(EmailProvider):
    """Dispatches via HTTP email API provider if configured, with console logger fallback."""

    def __init__(self) -> None:
        self.http_provider = HttpEmailProvider()
        self.console_provider = ConsoleEmailProvider()

    async def send(
        self, to_email: str, subject: str, body: str, from_email: Optional[str] = None
    ) -> bool:
        if self.http_provider.is_configured():
            return await self.http_provider.send(to_email, subject, body, from_email)
        return await self.console_provider.send(to_email, subject, body, from_email)


_default_mailer: EmailProvider = EmailService()


def get_mailer() -> EmailProvider:
    """Returns the active email provider instance."""
    return _default_mailer


def set_mailer(mailer: EmailProvider) -> None:
    """Replaces the active email provider (used in tests or DI)."""
    global _default_mailer
    _default_mailer = mailer


async def send_email(
    to_email: str, subject: str, body: str, from_email: Optional[str] = None
) -> bool:
    """Async convenience wrapper around the configured email provider."""
    return await get_mailer().send(to_email, subject, body, from_email)


async def send_birthday_wish(to_email: str, name: str) -> bool:
    """Sends the fixed-template birthday wish email asynchronously."""
    subject = f"Happy Birthday {name}!"
    body = BIRTHDAY_WISH_TEMPLATE.format(name=name)
    return await send_email(to_email=to_email, subject=subject, body=body)
