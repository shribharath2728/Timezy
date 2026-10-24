# Event Planner & Budget AI

An intelligent event planning platform built with a **FastAPI** backend, **MongoDB (PyMongo Native Async API >=4.9)**, **Groq AI (OpenAI-compatible)** for itemized budget generation, and a modern **React + Vite + Tailwind CSS + Recharts** frontend.

---

## 📁 Project Architecture & Layout

```text
event-planner/
├── .env                       # Environment secrets (preserved in root, never committed)
├── .gitignore                 # Git ignore rules
├── README.md                  # Project documentation
├── backend/
│   ├── .env.example           # Example environment template
│   ├── ai.py                  # Groq AI budget breakdown & refinement engine
│   ├── db.py                  # PyMongo native async connection & indexes
│   ├── gcal.py                # Google Calendar URL and .ics file generator
│   ├── main.py                # FastAPI routes and lifecycle
│   ├── planner.py             # Vendor checklists & timezone conversions
│   ├── pytest.ini             # Pytest async configuration
│   ├── requirements.txt       # Clean backend dependencies
│   ├── tests/
│   │   ├── conftest.py        # Test fixtures & test DB cleanup
│   │   └── test_planner.py    # Planner, budget validation, and gcal tests
│   └── wish.py                # Mailer providers (HTTP API + SMTP) & birthday wish delivery
└── frontend/
    ├── .env                   # VITE_API_URL=http://127.0.0.1:8000
    ├── package.json           # React, Vite, Tailwind CSS, Recharts, Lucide Icons
    ├── vite.config.js         # Vite & Tailwind configuration
    └── src/
        ├── App.jsx            # Multi-screen application root
        ├── api.js             # Backend API client with friendly 502 handling
        ├── constants.js       # Category and priority colors
        ├── components/
        │   ├── Navbar.jsx     # Navigation, theme toggle, notification status
        │   └── NotificationManager.jsx # Web notifications manager
        ├── context/
        │   ├── ThemeContext.jsx # Light / Dark mode provider
        │   └── ToastContext.jsx # Toast alerts provider
        └── screens/
            ├── DashboardScreen.jsx  # Countdown, category cards, stats
            ├── NewEventScreen.jsx   # 3-step wizard with skeleton loader
            ├── EventDetailScreen.jsx# Budget donut chart, vendor checklist, ideas
            └── CalendarScreen.jsx   # Monthly calendar grid with day previews
```

---

## 🚀 Key Features

1. **AI Budget Generation**: Generates itemized event expenses matching the exact budget (`sum(items) + buffer == total`).
2. **Category Vendor Checklists**: Default checklist attached for `birthday`, `wedding`, `meeting`, `travel`, and `community`.
3. **Birthday Wishes**: Fixed-template email wish sent via HTTP Email API or SMTP fallback when consent is granted.
4. **Calendar Integration**: Direct Google Calendar links and `.ics` file downloads.
5. **Modern Reactive UI**:
   - Donut chart & budget table.
   - Stepper wizard with skeleton loader during AI generation.
   - Dark mode toggle with persistent preferences.
   - Responsive down to 375px mobile viewports.

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

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

- Web UI: [http://localhost:5173](http://localhost:5173)

### 3. Running Backend Tests

```bash
cd backend
python -m pytest -v
```
