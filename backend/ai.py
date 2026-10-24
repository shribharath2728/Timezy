import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from dotenv import load_dotenv
from fastapi import HTTPException
import httpx

env_path = Path(__file__).resolve().parent / ".env"
if not env_path.exists():
    env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

SYSTEM_PROMPT = """You are an expert event planning and budget assistant.
Your task is to analyze the event details and classify each of the provided items.
You must respond with valid JSON only in the following schema:
{
  "items": [
    {
      "id": "<must match the provided user item id>",
      "item": "<item or task description>",
      "verdict": "<essential|optional|unnecessary>",
      "priority": "<P1|P2|P3|P4>",
      "cost": <number>,
      "lead_days": <number of days before event to do this item>,
      "duration_minutes": <default 30 or reasonable duration>
    }
  ],
  "buffer": <contingency buffer amount as number>,
  "total": <total budget amount as number>,
  "ideas": ["<creative idea 1>", "<creative idea 2>", "<creative idea 3>"]
}
CRITICAL REQUIREMENTS:
1. Every user item id provided in the request must be classified exactly once in "items".
2. The sum of the costs of all items plus the buffer MUST exactly equal the total budget specified.
3. Do not output any Markdown code fences or extra text, only raw valid JSON."""


async def ask_ai(message: str) -> str:
    """Calls Groq chat completions (OpenAI-compatible, JSON mode, temp 0.3)
    using GROQ_API_KEY and GROQ_MODEL from .env.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not configured in environment.",
        )
    model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ],
        "temperature": 0.3,
        "response_format": {"type": "json_object"},
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Groq API returned HTTP {e.response.status_code}: {e.response.text}",
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to communicate with Groq AI service: {str(e)}",
        )


def _validate_analysis(
    plan_data: Dict[str, Any],
    expected_ids: List[str],
    expected_total: Union[int, float],
) -> bool:
    """Validates:

    1. Every user item id classified exactly once.
    2. sum(items) + buffer == total (and total == expected_total).
    """
    try:
        items = plan_data.get("items", [])
        buffer = float(plan_data.get("buffer", 0))
        total = float(plan_data.get("total", 0))

        # 1. Budget sum check
        items_sum = sum(float(item.get("cost", 0)) for item in items)
        calculated_total = items_sum + buffer

        if abs(calculated_total - total) > 0.01 or abs(total - float(expected_total)) > 0.01:
            return False

        # 2. Item ID exact classification check
        if expected_ids:
            returned_ids = [str(item.get("id")) for item in items if "id" in item]
            if len(returned_ids) != len(expected_ids):
                return False
            if set(returned_ids) != set(str(eid) for eid in expected_ids):
                return False

        return True
    except Exception:
        return False


async def analyze_and_plan(
    event_details: Dict[str, Any],
    user_items: List[Dict[str, Any]],
    total: Union[int, float],
) -> Dict[str, Any]:
    """ONE async function calling Groq (JSON mode, temp 0.3).

    Validates output: every user item id classified exactly once, sum(items)+buffer == total.
    Retries once, else raises HTTP 502.
    """
    expected_ids = [str(item.get("id")) for item in user_items if item.get("id") is not None]

    items_prompt = [
        {"id": str(it.get("id")), "title": it.get("item") or it.get("title"), "notes": it.get("notes", "")}
        for it in user_items
    ]

    prompt_content = {
        "event_details": event_details,
        "user_items_to_classify": items_prompt,
        "target_budget": total,
    }

    ai_message = (
        f"{json.dumps(prompt_content)}\n\n"
        f"CRITICAL RULES:\n"
        f"1. Classify each of the {len(expected_ids)} user items above with its exact 'id'.\n"
        f"2. Verdict must be 'essential', 'optional', or 'unnecessary'.\n"
        f"3. Sum of all items costs + buffer must equal {total}.\n"
    )

    for attempt in range(2):
        try:
            raw_response = await ask_ai(ai_message)
            clean_text = raw_response.strip()
            if clean_text.startswith("```"):
                lines = clean_text.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                clean_text = "\n".join(lines).strip()

            result = json.loads(clean_text)

            # Check validity
            if _validate_analysis(result, expected_ids, total):
                return result
        except Exception:
            pass

    raise HTTPException(
        status_code=502,
        detail="Failed to generate valid plan analysis matching all item IDs and budget sum.",
    )


# Backward-compatible alias for existing tests/routes
async def get_plan(message: str, total: Union[int, float]) -> Dict[str, Any]:
    """Fallback helper for simple prompt refinement."""
    ai_message = (
        f"{message}\n\nIMPORTANT: Total budget is {total}. Output JSON only. "
        f"Sum of costs in 'items' plus 'buffer' MUST exactly equal {total}."
    )
    for attempt in range(2):
        try:
            raw = await ask_ai(ai_message)
            clean = raw.strip()
            if clean.startswith("```"):
                lines = clean.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                clean = "\n".join(lines).strip()
            data = json.loads(clean)
            items = data.get("items", [])
            buf = float(data.get("buffer", 0))
            tot = float(data.get("total", 0))
            if abs((sum(float(i.get("cost", 0)) for i in items) + buf) - tot) <= 0.01 and abs(tot - float(total)) <= 0.01:
                return data
        except Exception:
            pass

    raise HTTPException(
        status_code=502,
        detail="Failed to generate a valid event plan budget that matches total.",
    )
