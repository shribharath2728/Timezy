# Timezy — Smart Event & Celebration Planner

Timezy is a GenAI event planner: a **FastAPI** backend (Google Gemini, MongoDB, Google Calendar) and a **React + Vite + TypeScript** flip-book diary for birthdays, weddings, and other celebrations.

---

## Project layout

```text
event-planner/
├── README.md
├── docker-compose.yaml
├── backend/
│   ├── config.py              # Shared environment loader
│   ├── schemas.py             # Pydantic request models
│   ├── deps.py                # Session auth and plan lookup
│   ├── main.py                # FastAPI routes
│   ├── ai.py                  # Gemini plan, refine, and chat
│   ├── planner.py             # Checklists, timezones, free-slot search
│   ├── db.py                  # PyMongo async client and indexes
│   ├── gcal.py                # Google Calendar OAuth, sync, .ics
│   ├── wish.py                # Scheduled birthday wish email
│   ├── security.py            # Fernet tokens and signed cookies
│   ├── plan_views.py          # Plan serialization and ownership
│   ├── requirements.txt
│   └── tests/
└── frontend/
    ├── index.html
    ├── src/
    │   ├── App.tsx            # Plan state and Timezy shell
    │   ├── types/             # Shared EventPlan models
    │   ├── services/          # Storage, defaults, AI client
    │   ├── hooks/             # Live clock
    │   └── components/
    │       ├── layout/        # Header and floating AI button
    │       ├── landing/       # Welcome, date picker, setup
    │       ├── workspace/     # Flip-book planner and notes
    │       └── ai/            # Side-panel assistant
    └── nginx*.conf
```

---

## Features

1. **Timezy flip-book UI** — Sage-green device frames, page-turn planner, INR budget tracking.
2. **Event setup** — Birthday and function flows with date, venue, guests, and commencement time.
3. **Budget, calendar, checklist** — Itemized spend, day schedule, vendors, and task completion.
4. **GenAI assistant** — Themes, budget tips, and “add to plan” actions via `/plans/ai-assist`.
5. **Backend planning API** — Draft → refine → schedule, Google Calendar sync, and optional birthday wishes.
6. **Local persistence** — Plans stored in the browser; API used for AI and calendar workflows.

---

## Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

- API docs: http://127.0.0.1:8000/docs
- Health: `GET http://127.0.0.1:8000/health`

```bash
cd backend
python -m pytest -v
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- App: http://localhost:5173
