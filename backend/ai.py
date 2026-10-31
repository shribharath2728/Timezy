import json
import logging
import os
from typing import Any, Dict, List, Optional, Union
from fastapi import HTTPException
import httpx

import config  # noqa: F401

logger = logging.getLogger(__name__)

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
    """Calls Google Gemini generateContent API (JSON mode, temperature 0.3)
    using GEMINI_API_KEY and GEMINI_MODEL from .env.
    """
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured in environment.",
        )
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    model_name = model[7:] if model.startswith("models/") else model

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
    headers = {
        "x-goog-api-key": api_key,
        "Content-Type": "application/json",
    }
    params = {
        "key": api_key,
    }
    payload = {
        "system_instruction": {
            "parts": [
                {"text": SYSTEM_PROMPT}
            ]
        },
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": message}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "responseMimeType": "application/json",
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, params=params, json=payload)
            response.raise_for_status()
            data = response.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise HTTPException(
                    status_code=502,
                    detail="Gemini API returned no candidates.",
                )
            parts = candidates[0].get("content", {}).get("parts", [])
            if not parts:
                raise HTTPException(
                    status_code=502,
                    detail="Gemini API returned empty content.",
                )
            text = "".join(part.get("text", "") for part in parts if isinstance(part, dict) and "text" in part)
            return text
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini API returned HTTP {e.response.status_code}",
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to communicate with Gemini AI service: {str(e)}",
        )


async def ask_ai_chat(message: str, system_instruction: Optional[str] = None) -> str:
    """Conversational chat call to Google Gemini generateContent API (non-JSON mode)."""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured in environment.",
        )
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    model_name = model[7:] if model.startswith("models/") else model

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
    headers = {
        "x-goog-api-key": api_key,
        "Content-Type": "application/json",
    }
    params = {
        "key": api_key,
    }

    sys_text = (
        system_instruction
        or "You are Timezy's intelligent, friendly AI event planning assistant. "
        "You can engage in natural, warm, and polite everyday conversation (such as friendly greetings, answering general questions, chit-chat, and discussing how you can help). "
        "When asked about event planning, budgets, timelines, schedules, themes, or vendors, provide structured, realistic, and practical advice. "
        "IMPORTANT: If the event venue is a house, home, residence, or private property, NEVER suggest or calculate commercial banquet hall/venue rental costs (venue rental is ₹0). Reallocate all funds towards catering, custom celebration cake, home balloon & lighting decor, and photography. "
        "All monetary amounts, costs, and budgets MUST strictly be expressed in Indian Rupees (₹, INR). "
        "Be helpful, conversational, encouraging, and concise, using clean markdown formatting."
    )

    payload = {
        "system_instruction": {
            "parts": [
                {"text": sys_text}
            ]
        },
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": message}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            response = await client.post(url, headers=headers, params=params, json=payload)
            response.raise_for_status()
            data = response.json()
            candidates = data.get("candidates", [])
            if not candidates:
                return "I couldn't generate advice for that request right now."
            parts = candidates[0].get("content", {}).get("parts", [])
            return "".join(part.get("text", "") for part in parts if isinstance(part, dict) and "text" in part)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to communicate with Gemini AI service: {str(e)}",
        )


def generate_dynamic_chat_reply(prompt: str, details: Optional[Dict[str, Any]] = None) -> str:
    """Dynamically generates contextual, relevant answers tailored to the user's specific question
    and event details when Gemini API is unavailable or offline.
    """
    p = prompt.strip().lower()
    details = details or {}
    title = details.get("title") or "Celebration"
    category = details.get("category", "birthday")
    venue = details.get("venue", "Celebration Venue")
    budget = float(details.get("budget", 25000))
    guests = int(details.get("guests", 50))
    date = details.get("date", "Upcoming Event")
    c_time = details.get("commencementTime") or details.get("commencement_time") or "06:30 PM"
    cost_per_guest = round(budget / max(1, guests))
    is_home = any(h in venue.lower() for h in ["house", "home", "flat", "apartment", "residence", "terrace", "backyard"])

    # 0. Plan Review / Health Check ("Hello! How is my plan looking?", "Review my plan", "Plan status", etc.)
    plan_look_triggers = [
        "how is my plan", "how's my plan", "how is the plan", "how's the plan",
        "review my plan", "plan review", "how does it look", "how does my plan look",
        "check my plan", "plan status", "how am i doing", "how is this looking",
        "how are things looking", "is my plan good", "rate my plan"
    ]
    if any(trigger in p for trigger in plan_look_triggers):
        is_home_text = "₹0 venue rental cost (home celebration advantage)" if is_home else "venue reservation included"
        return (
            f"### Executive Plan Review for **{title}** 🌟\n\n"
            f"Your celebration plan is looking **well-structured, financially realistic, and right on track**! Here is an executive breakdown:\n\n"
            f"• **Financial Health & Budget:**\n"
            f"  - Target Budget: **₹{budget:,.0f}** for **{guests} guests** (~**₹{cost_per_guest:,.0f} per guest**).\n"
            f"  - Venue Cost: **{is_home_text}**.\n"
            f"  - Budget Allocation: Balanced coverage across catering, decor, photography, and contingency buffer.\n\n"
            f"• **Commencement & Timeline:**\n"
            f"  - Scheduled Date: **{date}**\n"
            f"  - Commencement Time: **{c_time}**\n"
            f"  - Flow: Pre-event setup (2 hrs before), guest arrival & welcome drinks ({c_time}), main ceremony (~45 mins later), and dinner buffet.\n\n"
            f"• **Venue & Ambience:**\n"
            f"  - Location: **{venue}**\n\n"
            f"• **Top 3 Recommended Next Steps:**\n"
            f"  1. *Send out digital WhatsApp invitations 10 to 14 days before {date}.*\n"
            f"  2. *Lock in menu tasting and confirm live stations (chaat/finger foods).*\n"
            f"  3. *Reconfirm final guest RSVP headcount 48 hours prior to the event.*\n\n"
            f"Everything is aligned! Would you like me to suggest catering menu items, write an invitation message, or fine-tune your day-of schedule?"
        )

    # 1. Pure Greetings & Chit-Chat (Only if NOT containing a substantive question)
    is_pure_greeting = any(p.startswith(w) for w in ["hi", "hello", "hey", "namaste", "good morning", "good afternoon", "good evening"])
    has_substantive_query = any(w in p for w in ["?", "plan", "how", "what", "when", "where", "why", "cost", "budget", "cake", "food", "decor", "invite", "schedule", "menu"])

    if is_pure_greeting and not has_substantive_query:
        if "how are you" in p:
            return (
                f"I am doing wonderful, thank you for asking! 😊\n\n"
                f"I am ready to help you plan **{title}**. Whether you need advice on food catering, "
                f"cake design, invitations, decorating the venue, or tracking your ₹{budget:,.0f} budget, "
                f"ask me anything specific!"
            )
        return (
            f"Hello! Great to connect with you. How can I assist you with **{title}** today?\n\n"
            f"You can ask me specific questions like:\n"
            f"• *\"How is my plan looking?\"*\n"
            f"• *\"What is a good invitation message for WhatsApp?\"*\n"
            f"• *\"How many kg of cake do I need for {guests} guests?\"*\n"
            f"• *\"Suggest an exact day-of schedule around {c_time}\"*\n"
            f"• *\"How can I save money on catering and decor?\"*"
        )

    if any(w in p for w in ["who are you", "what can you do", "help me"]):
        return (
            f"I am **Timezy AI**, your dedicated celebration planning assistant!\n\n"
            f"I can help you directly with:\n"
            f"• **Detailed Day-of Timelines**: Run-of-show scheduled around your start time of {c_time}.\n"
            f"• **Budget Calculations**: Allocating your ₹{budget:,.0f} budget realistically across catering, decor, and photography.\n"
            f"• **Food & Cake Sizing**: Exact portions, catering menu advice, and bakery recommendations.\n"
            f"• **Personalized Invitations**: Ready-to-copy WhatsApp messages and formal invitation wording.\n"
            f"• **Games & Entertainment**: Icebreakers and activities for guests of all ages."
        )

    if any(w in p for w in ["thank you", "thanks", "great job", "awesome", "perfect"]):
        return (
            f"You're very welcome! I'm thrilled to help make **{title}** a smooth and memorable celebration. 🎉\n\n"
            f"Let me know if there's any other detail you want to explore or fine-tune!"
        )

    # 2. Specific Activity & Timing Inquiries
    if ("cake" in p or "cutting" in p) and any(w in p for w in ["time", "when", "schedule", "slot", "hour"]):
        return (
            f"### Ideal Cake Cutting Timing for {title}\n\n"
            f"For your celebration commencing at **{c_time}**:\n\n"
            f"• **Recommended Cake Cutting Time:** **45 to 60 minutes after commencement** (around **{c_time} + 45 mins**).\n"
            f"• **Why this timing works best:**\n"
            f"  1. It allows late-arriving guests to arrive, settle in, and grab welcome refreshments.\n"
            f"  2. Everyone's hair, makeup, and clothes are still fresh for group photographs around the cake.\n"
            f"  3. It builds excitement as the centerpiece of the evening before the main dinner buffet opens.\n"
            f"• **Run-of-Show Tip:** Announce the cake cutting 5 minutes prior over the microphone and dim ambient lights while lighting sparkler candles!"
        )

    if ("food" in p or "dinner" in p or "lunch" in p or "buffet" in p) and any(w in p for w in ["time", "when", "schedule", "start", "serve"]):
        return (
            f"### Dining & Buffet Timing for {title}\n\n"
            f"With your event commencing at **{c_time}**:\n\n"
            f"• **Welcome Drinks & Finger Appetizers:** Ready and served immediately at **{c_time}** as guests arrive.\n"
            f"• **Live Counters (Chaat/Pasta):** Active from commencement until the main cake cutting.\n"
            f"• **Main Dinner Buffet Opening:** Open the full dinner buffet **75 to 90 minutes after commencement**.\n"
            f"• **Dessert Station:** Keep desserts warm and accessible until the celebration concludes."
        )

    # 3. Invitation & WhatsApp Text
    if any(w in p for w in ["invite", "invitation", "message", "whatsapp", "wording", "card text", "rsvp"]):
        return (
            f"### Ready-to-Send Invitation Message\n\n"
            f"Here is a warm, polished invitation template you can copy and share on WhatsApp:\n\n"
            f"---\n"
            f"✨ **You are cordially invited to celebrate with us!** ✨\n\n"
            f"We warmly invite you to join us for **{title}** as we create cherished memories together.\n\n"
            f"📅 **Date:** {date}\n"
            f"⏰ **Commencement:** {c_time}\n"
            f"📍 **Venue:** {venue}\n\n"
            f"Your gracious presence will bring joy to our celebration! Kindly RSVP by replying to this message.\n\n"
            f"*Warm regards,*\n"
            f"*The Host Family*\n"
            f"---\n\n"
            f"💡 **Tip:** Send this out 10 to 14 days before the event, and send a location pin on WhatsApp on the morning of {date}."
        )

    # 3. Cake & Confectionery
    if any(w in p for w in ["cake", "flavor", "bakery", "pastry", "dessert", "kg"]):
        kg_needed = round(guests * 0.1, 1)
        if kg_needed < 1.0:
            kg_needed = 1.0
        return (
            f"### Cake Recommendations for {title}\n\n"
            f"• **Recommended Cake Size:** For **{guests} guests**, you need approximately **{kg_needed} kg** "
            f"(calculating ~80–100g per guest portion).\n"
            f"• **Trending Flavor Combos:**\n"
            f"  1. *Belgian Dark Chocolate Truffle with Salted Caramel*\n"
            f"  2. *Lotus Biscoff Crunch with Cream Cheese Frosting*\n"
            f"  3. *Classic Red Velvet with White Chocolate Ganache*\n"
            f"  4. *Rasmalai / Rose Pistachio Fusion Cake (popular crowd-pleaser)*\n"
            f"• **Estimated Cost:** ₹{int(kg_needed * 900):,.0f} to ₹{int(kg_needed * 1400):,.0f} depending on custom fondant/tier styling.\n"
            f"• **Timing:** Order at least 4 to 5 days ahead, and schedule delivery 90 minutes before {c_time} so it is displayed before guests arrive."
        )

    # 4. Catering, Food & Drinks
    if any(w in p for w in ["food", "catering", "menu", "snack", "dinner", "lunch", "starter", "beverage", "drink", "buffet", "chaat"]):
        food_budget = round(budget * 0.45) if is_home else round(budget * 0.35)
        plate_rate = round(food_budget / max(1, guests))
        return (
            f"### Catering & Menu Strategy for {title}\n\n"
            f"• **Budget Allocation:** Target approximately **₹{food_budget:,.0f}** for food and beverages (~₹{plate_rate} per guest for {guests} guests).\n"
            f"• **Recommended Menu Blueprint:**\n"
            f"  1. **Welcome Drinks (2 items):** Fresh Lime Mint Cooler & Virgin Mojito or Mango Lassi.\n"
            f"  2. **Finger Starters (3 items):** Paneer Tikka Skewers, Crispy Corn Cups, Cocktail Veg Cutlets (or Chicken Tikka if non-veg).\n"
            f"  3. **Live Counter:** Live Sev Puri / Dahi Puri / Chaat station or Pasta counter—guests love interactive food counters!\n"
            f"  4. **Main Feast:** 2 Gravies (e.g. Paneer Butter Masala + Dal Makhani), Pulao/Jeera Rice, Assorted Roti/Naan, and Fresh Salad.\n"
            f"  5. **Desserts:** Warm Gulab Jamun with Vanilla Ice Cream or Shahi Tukda.\n\n"
            f"💡 **Pro-Tip:** Always instruct caterers to prepare for a 10% buffer over {guests} guests to avoid running short."
        )

    # 5. Return Gifts & Favors
    if any(w in p for w in ["gift", "return gift", "favor", "hamper", "token", "giveaway"]):
        gift_budget = round(budget * 0.08)
        per_gift = round(gift_budget / max(1, guests))
        return (
            f"### Thoughtful Return Gift Ideas (~₹{per_gift} per guest)\n\n"
            f"With an estimated budget of **₹{gift_budget:,.0f}** across {guests} guests:\n\n"
            f"1. **Mini Potted Succulent Plants (~₹120–₹180):** Eco-friendly, memorable, and long-lasting.\n"
            f"2. **Artisanal Handcrafted Chocolate Hamper (~₹150–₹250):** Box of 4 gourmet truffles with a customized thank-you sticker.\n"
            f"3. **Scented Soy Wax Candles in Brass/Glass Jars (~₹160–₹220):** Elegant and universally appreciated.\n"
            f"4. **Personalized Stainless Steel Travel Tumbler or Jute Pouch (~₹180–₹280):** High utility for guests.\n\n"
            f"Arrange them on an aesthetically decorated table near the exit so guests receive them as they depart."
        )

    # 6. Music, Sound & DJ
    if any(w in p for w in ["music", "dj", "sound", "song", "playlist", "speaker", "audio", "dance"]):
        return (
            f"### Music & Sound Planning for {title}\n\n"
            f"• **Volume & Regulations:** In India, ambient sound is allowed outdoors until **10:00 PM**. Keep heavy bass controlled if in a residential area.\n"
            f"• **Playlist Flow:**\n"
            f"  - **Arrival ({c_time}):** Soft acoustic covers, instrumental lofi, or contemporary ghazals to encourage conversation.\n"
            f"  - **Ceremony / Cake Cutting:** High-energy celebration fanfare or celebratory acoustic chorus.\n"
            f"  - **Post-Dinner:** Upbeat Bollywood hits, Retro classics, and pop anthems for open dance.\n"
            f"• **Equipment:** If hosted at **{venue}**, two 12-inch active PA speakers with 2 wireless microphones are sufficient for {guests} guests (~₹3,500–₹5,500 rental)."
        )

    # 7. Photography & Videography
    if any(w in p for w in ["photo", "photographer", "camera", "video", "reel", "shoot", "portrait"]):
        return (
            f"### Photography & Memory Capture for {title}\n\n"
            f"• **Coverage Timeline:** Book the photographer for **3 to 4 hours**, starting 30 minutes before {c_time} until dinner ends.\n"
            f"• **Must-Have Shot List:**\n"
            f"  1. Decor details (cake, stage floral arch, entrance welcome easel) before guests enter.\n"
            f"  2. Candid family portraits while everyone's makeup and attire are fresh.\n"
            f"  3. Unrehearsed candid reactions during the main ceremony / cake cutting.\n"
            f"  4. Fun 15-second Instagram reel clips with friends and relatives.\n"
            f"• **Estimated Cost:** ₹8,000 to ₹18,000 for a candid photographer with edited highlights and raw files delivered within 7 days."
        )

    # 8. Home Venue Logistics
    if any(w in p for w in ["home", "house", "flat", "apartment", "space", "neighbor", "parking", "clean"]):
        return (
            f"### Home Celebration Logistics ({venue})\n\n"
            f"Hosting {guests} guests at home is intimate and saves commercial hall rental fees! Here is how to organize the space:\n\n"
            f"1. **Clear Central Flow:** Shift excess living room furniture, center tables, and fragile knick-knacks to a closed bedroom to create standing room.\n"
            f"2. **Separate Food & Buffet Area:** Place the buffet tables along a single perimeter wall or terrace to prevent bottlenecking.\n"
            f"3. **Neighbor Courtesy:** Send a friendly heads-up message to immediate neighbors 2 days in advance mentioning celebration hours ({c_time} to 10:30 PM).\n"
            f"4. **Designated Shoe Area & Coat Rack:** Keep a neat tiered shoe rack outside the main doorway.\n"
            f"5. **Trash Stations:** Place 2 large lined waste bins near the beverage and dessert counters for easy cleanup."
        )

    # 9. Schedule & Timeline
    if any(w in p for w in ["schedule", "timeline", "time", "slot", "agenda", "delay", "flow", "run of show", "start"]):
        return (
            f"### Realistic Celebration Day Flow ({title})\n"
            f"**Event Date:** {date} | **Official Commencement:** {c_time}\n\n"
            f"• **2 Hours Prior:** Venue inspection, stage & floral backdrop completion, and sound test.\n"
            f"• **1 Hour Prior:** Cake delivery verification, dessert setup, and host family dressing.\n"
            f"• **{c_time} (Commencement):** Guest arrival begins, welcome coolers/mocktails served, background music playing.\n"
            f"• **+45 Minutes:** Family photo session with guests and informal socializing.\n"
            f"• **+1 Hour 15 Mins:** Main ceremony / cake cutting & congratulations.\n"
            f"• **+1 Hour 45 Mins:** Multi-course banquet dinner buffet opens with live counters.\n"
            f"• **+3 Hours:** Celebration wrap-up, return gift hampers distribution, and departure."
        )

    # 10. Games & Entertainment
    if any(w in p for w in ["game", "activity", "activities", "entertainment", "fun", "kids"]):
        return (
            f"### Interactive Celebration Games for {guests} Guests\n\n"
            f"1. **Instant Polaroid Guestbook:** Set up an instant camera where guests snap a photo, stick it in an album, and write a heartwarming note.\n"
            f"2. **Celebrant Trivia / \"Who Knows Best?\":** 10 quick multiple-choice questions about the celebrant with chocolate bars for winners.\n"
            f"3. **Musical Tambola / Bingo:** Instead of numbers, play 90s and 2000s Bollywood song snippets where guests cross off tracks.\n"
            f"4. **Photo Scavenger Hunt:** Give guests 5 fun photo prompts (e.g., \"selfie with the oldest guest\", \"funniest pose with the decor\")."
        )

    # 11. Budget & Cost Saving
    if any(w in p for w in ["budget", "cost", "save", "money", "rupee", "inr", "expense", "cheap", "affordable"]):
        catering_est = round(budget * 0.45) if is_home else round(budget * 0.35)
        decor_est = round(budget * 0.20)
        return (
            f"### Budget Breakdown & Savings for {title}\n\n"
            f"**Total Target Budget:** ₹{budget:,.0f} (~₹{cost_per_guest} per guest for {guests} guests)\n\n"
            f"• **Catering & Drinks:** ₹{catering_est:,.0f} (Highest impact area)\n"
            f"• **Decor & Lighting:** ₹{decor_est:,.0f}\n"
            f"• **Photography & Video:** ₹{round(budget * 0.12):,.0f}\n"
            f"• **Custom Cake:** ₹{round(budget * 0.08):,.0f}\n"
            f"• **Emergency Buffer:** ₹{round(budget * 0.10):,.0f}\n\n"
            f"💰 **Top 3 Money-Saving Tips:**\n"
            f"1. *Opt for 3 live snack counters + 1 dessert instead of a 15-dish heavy buffet—guests enjoy it more and food waste drops by 40%!*\n"
            f"2. *Use warm fairy lights with fresh foliage instead of expensive exotic imported flowers.*\n"
            f"3. *Send interactive digital WhatsApp invitations with embedded RSVP buttons rather than paper printing.*"
        )

    # 12. General Direct Answer for Any Other Topic
    return (
        f"### Advice for **{title}**\n\n"
        f"Regarding your question about **\"{prompt}\"**:\n\n"
        f"• **Context & Timing:** With **{guests} guests** expected at **{venue}** commencing at **{c_time}**, "
        f"keep the guest experience seamless and comfortable.\n"
        f"• **Key Recommendation:** Prioritize clear coordination with your vendor team 48 hours prior to **{date}**. "
        f"Ensure one designated family member or friend handles coordination on the day so you can enjoy the celebration.\n"
        f"• **Financial Guardrail:** Keep any adjustments within your ₹{budget:,.0f} target budget (~₹{cost_per_guest} per guest).\n\n"
        f"Would you like me to elaborate on specific vendor options, timeline adjustments, or menu selections?"
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
    """ONE async function calling Gemini (JSON mode, temp 0.3).

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
        except Exception as exc:
            logger.warning("analyze_and_plan attempt %s failed: %s", attempt + 1, exc)

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
        except Exception as exc:
            logger.warning("get_plan attempt %s failed: %s", attempt + 1, exc)

    raise HTTPException(
        status_code=502,
        detail="Failed to generate a valid event plan budget that matches total.",
    )
