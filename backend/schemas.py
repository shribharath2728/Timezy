"""Pydantic request models for the Timezy API."""

from __future__ import annotations

import re
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

from planner import DEFAULT_TIMEZONE

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class CategoryEnum(str, Enum):
    birthday = "birthday"
    wedding = "wedding"
    meeting = "meeting"
    travel = "travel"
    community = "community"


class PlanStatusEnum(str, Enum):
    draft = "draft"
    scheduled = "scheduled"


class WishConfig(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    consent: Optional[bool] = False
    sent: Optional[bool] = False


class WishConsentRequest(BaseModel):
    consent: Optional[bool] = True
    email: Optional[str] = None
    name: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return v
        if not EMAIL_RE.match(v):
            raise ValueError("email must be a valid address")
        return v


class PlanCreateRequest(BaseModel):
    title: str = Field(..., min_length=1)
    category: CategoryEnum
    event_start: str = Field(..., description="Event start datetime (ISO string)")
    budget: float = Field(..., gt=0)
    tz: Optional[str] = Field(default=DEFAULT_TIMEZONE, description="User IANA timezone")
    guests: Optional[int] = Field(default=0, ge=0)
    location: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[PlanStatusEnum] = PlanStatusEnum.draft
    wish: Optional[WishConfig] = None
    user_items: Optional[List[Dict[str, Any]]] = None

    @field_validator("event_start")
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        try:
            try:
                datetime.fromisoformat(v)
            except ValueError:
                datetime.strptime(v, "%Y-%m-%d")
            return v
        except Exception:
            raise ValueError(
                "event_start must be a valid ISO format string (e.g. 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM:SS')"
            )


class ItemPatchRequest(BaseModel):
    verdict: Optional[str] = None
    keep: Optional[bool] = None
    item: Optional[str] = None
    title: Optional[str] = None
    priority: Optional[str] = None
    cost: Optional[float] = None
    lead_days: Optional[int] = None
    done: Optional[bool] = None


class PlanRefineRequest(BaseModel):
    change: str = Field(..., min_length=1)
    new_total: Optional[float] = Field(None, gt=0)
    new_budget: Optional[float] = Field(None, gt=0)


class AiAssistRequest(BaseModel):
    message: str = Field(..., min_length=1)
    event_details: Optional[Dict[str, Any]] = None


class SessionLoginRequest(BaseModel):
    google_id: str
    email: str
    tz: Optional[str] = DEFAULT_TIMEZONE
    refresh_token: Optional[str] = None
