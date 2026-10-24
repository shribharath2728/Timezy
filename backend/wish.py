import os
import smtplib
from abc import ABC, abstractmethod
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from typing import Optional, Dict, Any
from dotenv import load_dotenv
import httpx

env_path = Path(__file__).resolve().parent / ".env"
if not env_path.exists():
    env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

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

        sender = from_email or os.getenv("SMTP_FROM", "no-reply@eventplanner.com")
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


class SmtpEmailProvider(EmailProvider):
    """SMTP SSL email provider fallback."""

    def send(self, to_email: str, subject: str, body: str, from_email: Optional[str] = None) -> bool:
        smtp_host = os.getenv("SMTP_HOST", "localhost")
        smtp_port = int(os.getenv("SMTP_PORT", "465"))
        smtp_user = os.getenv("SMTP_USER", "")
        smtp_pass = os.getenv("SMTP_PASS", "")
        sender = from_email or os.getenv("SMTP_FROM", smtp_user or "no-reply@eventplanner.com")

        msg = MIMEMultipart()
        msg["From"] = sender
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        try:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10.0) as server:
                if smtp_user and smtp_pass:
                    server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            return True
        except Exception as e:
            raise RuntimeError(f"SMTP provider failed: {e}") from e


class CompositeEmailService(EmailProvider):
    """Dispatches via HTTP email API provider if configured, with automatic fallback to SMTP."""

    def __init__(self):
        self.http_provider = HttpEmailProvider()
        self.smtp_provider = SmtpEmailProvider()

    def send(self, to_email: str, subject: str, body: str, from_email: Optional[str] = None) -> bool:
        if self.http_provider.is_configured():
            try:
                return self.http_provider.send(to_email, subject, body, from_email)
            except Exception:
                return self.smtp_provider.send(to_email, subject, body, from_email)

        return self.smtp_provider.send(to_email, subject, body, from_email)


_default_mailer: EmailProvider = CompositeEmailService()


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
