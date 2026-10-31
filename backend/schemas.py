"""Pydantic request/response models for the Timezy API.

All models use strict validators and clear field descriptions so that
FastAPI's auto-generated OpenAPI schema is self-documenting.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator, EmailStr

from planner import DEFAULT_TIMEZONE


class CategoryEnum(str, Enum):
    """Supported event categories."""

    birthday = "birthday"
    wedding = "wedding"
    meeting = "meeting"
    travel = "travel"
    community = "community"


class PlanStatusEnum(str, Enum):
    """Lifecycle state of a plan."""

    draft = "draft"
    scheduled = "scheduled"


class VendorItemModel(BaseModel):
    """A single vendor/task item supplied by the user during plan creation.

    The AI classifier uses these fields to assign verdict, priority, and cost.
    """

    id: Optional[str] = Field(None, description="Client-provided stable identifier")
    item: Optional[str] = Field(None, description="Short description of the vendor or task")
    title: Optional[str] = Field(None, description="Alias for 'item' accepted from frontend")
    cost: Optional[float] = Field(None, ge=0, description="Estimated cost in INR")
    lead_days: Optional[int] = Field(None, ge=0, description="Days before event to arrange this item")
    priority: Optional[str] = Field(None, description="P1–P4 priority hint")
    done: Optional[bool] = Field(False, description="Whether this item has been completed")
    notes: Optional[str] = Field(None, description="Additional notes for the AI classifier")

    model_config = {"extra": "allow"}


class WishConfig(BaseModel):
    """Birthday/event wish settings embedded in a plan."""

    name: Optional[str] = None
    email: Optional[EmailStr] = None
    consent: Optional[bool] = False
    sent: Optional[bool] = False


class WishConsentRequest(BaseModel):
    """Payload for POST /plans/{id}/wish-consent."""

    consent: Optional[bool] = True
    email: Optional[EmailStr] = None
    name: Optional[str] = None


class PlanCreateRequest(BaseModel):
    """Payload for POST /plans — creates a new draft event plan."""

    title: str = Field(..., min_length=1, description="Human-readable event title")
    category: CategoryEnum = Field(..., description="One of: birthday, wedding, meeting, travel, community")
    event_start: str = Field(..., description="Event start datetime (ISO-8601 string)")
    budget: float = Field(..., gt=0, description="Total budget in INR")
    tz: Optional[str] = Field(default=DEFAULT_TIMEZONE, description="User's IANA timezone")
    guests: Optional[int] = Field(default=0, ge=0, description="Expected guest count")
    location: Optional[str] = Field(None, description="Venue name or address")
    notes: Optional[str] = Field(None, description="Free-text notes for the AI planner")
    status: Optional[PlanStatusEnum] = Field(
        PlanStatusEnum.draft, description="Initial status (always saved as 'draft')"
    )
    wish: Optional[WishConfig] = Field(None, description="Optional birthday-wish opt-in settings")
    user_items: Optional[List[VendorItemModel]] = Field(
        None, description="User-provided vendor/task list; falls back to category defaults if omitted"
    )

    @field_validator("event_start")
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        """Accepts full ISO-8601 datetimes or bare YYYY-MM-DD date strings."""
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
    """Payload for PATCH /plans/{id}/items/{item_id} — partial update of a single vendor item."""

    verdict: Optional[str] = Field(None, description="AI verdict override: essential|optional|unnecessary")
    keep: Optional[bool] = Field(None, description="User override to keep an unnecessary item")
    item: Optional[str] = Field(None, description="Update the item description text")
    title: Optional[str] = Field(None, description="Alias for 'item'")
    priority: Optional[str] = Field(None, description="Override priority: P1|P2|P3|P4")
    cost: Optional[float] = Field(None, ge=0, description="Override estimated cost in INR")
    lead_days: Optional[int] = Field(None, ge=0, description="Override lead days before event")
    done: Optional[bool] = Field(None, description="Mark item as done/undone")


class PlanRefineRequest(BaseModel):
    """Payload for POST /plans/{id}/refine — re-analyse plan with updated requirements."""

    change: str = Field(..., min_length=1, description="Natural-language description of the refinement")
    new_total: Optional[float] = Field(None, gt=0, description="New total budget in INR")
    new_budget: Optional[float] = Field(None, gt=0, description="Alias for new_total")


class AiAssistRequest(BaseModel):
    """Payload for POST /plans/ai-assist — conversational AI planning assistant."""

    message: str = Field(..., min_length=1, description="User's question or request")
    event_details: Optional[Dict[str, Any]] = Field(
        None, description="Optional event context (title, budget, venue, etc.) for personalised replies"
    )


class SessionLoginRequest(BaseModel):
    """Payload for POST /auth/session — creates or refreshes a session directly.

    Intended for development, testing, and token-exchange flows.
    The ``refresh_token`` field is optional; omit it if only refreshing session metadata.
    """

    google_id: str = Field(..., description="Google OAuth subject identifier")
    email: EmailStr = Field(..., description="User's verified email address")
    tz: Optional[str] = Field(DEFAULT_TIMEZONE, description="User's IANA timezone")
    refresh_token: Optional[str] = Field(
        None, description="Google OAuth refresh token (stored encrypted with Fernet)"
    )
