# Gather & Plan — GenAI-Powered Event Planning Diary

An intelligent event planning platform combining a **FastAPI** backend (powered by **Google Gemini AI** and **PyMongo Native Async**) with a **React + Vite + TypeScript** digital diary frontend.

---

## 📁 Project Architecture & Layout

```text
event-planner/
├── .env                       # Environment secrets (preserved in root, never committed)
├── .gitignore                 # Git ignore rules
├── README.md                  # Project documentation
├── backend/
│   ├── .env.example           # Example environment template
│   ├── ai.py                  # Gemini AI budget breakdown & refinement engine
│   ├── db.py                  # PyMongo native async connection & indexes
│   ├── gcal.py                # Google Calendar URL and .ics file generator
│   ├── main.py                # FastAPI routes and lifecycle
│   ├── planner.py             # Vendor checklists & timezone conversions
│   ├── pytest.ini             # Pytest async configuration
│   ├── requirements.txt       # Clean backend dependencies
│   ├── tests/
│   │   ├── conftest.py        # Test fixtures & test DB cleanup
│   │   └── test_planner.py    # Planner, budget validation, and gcal tests
│   └── wish.py                # Email wish delivery via HTTP email API
└── frontend/                  # Modern React + Vite + TypeScript Diary UI
    ├── index.html             # Typography (Lora, Manrope, Caveat) & paper canvas
    ├── package.json           # Frontend dependencies (Lucide React, Tailwind v4)
    ├── vite.config.ts         # Vite bundler & backend proxy configuration
    └── src/
        ├── types/             # Shared TypeScript models (EventPlan, BudgetItem, etc.)
        ├── services/          # Storage, plan generator & GenAI assistant services
        ├── components/        # Diary UI components:
        │   ├── Header.tsx     # Refined diary header
        │   ├── DateSelector.tsx # Interactive diary date block & calendar popover
        │   ├── LandingPage.tsx  # Event category selection (Birthday & Functions)
        │   ├── Workspace.tsx    # Event planning workspace with diary banner
        │   ├── OverviewTab.tsx  # Concised diary event summary & stats
        │   ├── BudgetPlannerTab.tsx # Itemized budget calculation & progress
        │   ├── TimelineTab.tsx  # Date-aware chronological organizing order
        │   ├── ChecklistAndVendorsTab.tsx # Interactive checklists & vendor management
        │   └── AiAssistantPanel.tsx       # Collapsible GenAI diary assistant panel
        └── App.tsx            # Main application coordinator with LocalStorage persistence
```

---

## 🚀 Key Features

1. **Digital Diary Aesthetic**: Warm ivory (`#F6F2E9`), soft parchment (`#EDE5D7`), paper white (`#FCFAF5`), fine borders (`#DDD5C8`), and serif typography (`Lora`) inspired by physical stationery.
2. **Dynamic Date Selector**: Interactive calendar popover updating day, month, and year dynamically into an elegant diary date block (`THURSDAY 29 OCTOBER 2026`).
3. **Primary Event Categories**: Distinct, restrained setup flows for **Birthday** and **Functions** (weddings, anniversaries, family gatherings, community events).
4. **Interactive Budget Planner**: Categorized expenses with estimated vs. actual tracking, automatic remaining balance calculations, and subtle allocation warnings.
5. **Organizing Order Timeline**: Chronologically computed milestones relative to the event date (6-8 weeks before, 3-4 weeks before, 1-2 weeks before, final few days, event day).
6. **Checklists & Vendor Roster**: 7 categorized task checklists with interactive completion tracking, alongside vendor contracts, quoted prices, and advance payment statuses.
7. **GenAI Diary Assistant**: Collapsible side panel with quick actions ("Generate a theme", "Optimize my budget", "What should I do next?") offering interactive "Add to Plan" actions.
8. **Data Persistence**: Automatic LocalStorage synchronization preserving all user entries across page refreshes.

---

## 🛠️ Setup & Execution

### 1. Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

- API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health check: `GET http://127.0.0.1:8000/health`

### 2. Running Backend Tests

```bash
cd backend
python -m pytest -v
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

- Local Dev URL: [http://localhost:5173](http://localhost:5173)

