# SYNCHER — Implementation Plan
**"Understand your body → Predict → Prevent → Optimize lifestyle"**

An AI-powered personal health intelligence system for menstrual cycle monitoring, prediction, and personalized health insights.

---

## Background & Scope

SYNCHER is a full-stack health intelligence platform combining:
- **Predictive ML** for cycle/ovulation forecasting
- **Risk detection** for early health warnings (PCOS, anemia indicators)
- **AI chatbot** for conversational health guidance
- **Lifestyle intelligence** for hormonal phase-aware recommendations

This is a large system. We will build it in **5 progressive phases**, each delivering a usable, testable increment.

---

## User Review Required

> [!IMPORTANT]
> **Database Choice**: The plan uses **SQLite** for initial development (Phase 1–2) and migrates to **PostgreSQL** for production (Phase 3+). This avoids requiring Postgres setup during early development. Is this acceptable?

> [!IMPORTANT]
> **LLM Provider**: The AI chatbot requires an LLM API. Options:
> 1. **OpenAI API** (GPT-4o) — best quality, requires API key & costs
> 2. **Google Gemini API** — free tier available, good quality
> 3. **Local model** (Ollama + Llama 3) — free, runs locally, requires GPU
>
> Which provider do you prefer? We'll design the interface to be swappable.

> [!WARNING]
> **Celery + Redis**: These require separate service installations (Redis server). For Phase 1–3, we'll use Django's built-in async capabilities and simple cron-style scheduling. Celery/Redis will be introduced in Phase 4 (Production Hardening). OK?

> [!IMPORTANT]
> **Kaggle Dataset**: For bootstrapping the ML model before users have enough data, we plan to use a public menstrual cycle dataset. We'll include a data loading script for this. Acceptable?

---

## Project Architecture

```
SYNCHERV1/
├── backend/                          # Django project
│   ├── manage.py
│   ├── requirements.txt
│   ├── syncher/                      # Django project config
│   │   ├── settings/
│   │   │   ├── base.py               # Shared settings
│   │   │   ├── development.py        # Dev settings (SQLite)
│   │   │   └── production.py         # Prod settings (Postgres)
│   │   ├── celery.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── apps/
│   │   ├── accounts/                 # User auth & profiles
│   │   │   ├── models.py             # UserProfile, OnboardingData
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   └── urls.py
│   │   ├── tracker/                  # Core cycle tracking
│   │   │   ├── models.py             # CycleLog, DailyLog, Symptom
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── services.py           # Business logic
│   │   │   └── urls.py
│   │   ├── predictions/              # ML prediction engine
│   │   │   ├── models.py             # PredictionResult, RiskAlert
│   │   │   ├── ml_engine.py          # ML model loading & inference
│   │   │   ├── preprocessing.py      # Data cleaning & feature eng
│   │   │   ├── views.py
│   │   │   └── urls.py
│   │   ├── insights/                 # Insight & risk engine
│   │   │   ├── models.py             # Insight, Recommendation
│   │   │   ├── rules_engine.py       # Rule-based risk detection
│   │   │   ├── recommendation.py     # Lifestyle recommendations
│   │   │   ├── views.py
│   │   │   └── urls.py
│   │   └── chatbot/                  # AI assistant
│   │       ├── models.py             # ChatHistory
│   │       ├── llm_service.py        # LLM integration (swappable)
│   │       ├── rag_engine.py         # RAG: user data retrieval
│   │       ├── views.py
│   │       └── urls.py
│   └── ml_models/                    # Trained model files
│       ├── train_baseline.py         # Linear regression training
│       ├── train_lstm.py             # LSTM training script
│       ├── data_loader.py            # Kaggle dataset loader
│       └── saved/                    # Serialized model files
│
├── frontend/                         # React + Vite
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api/                      # Axios API client
│       │   └── client.js
│       ├── features/
│       │   ├── auth/                 # Login, Register, Onboarding
│       │   │   ├── LoginPage.jsx
│       │   │   ├── RegisterPage.jsx
│       │   │   └── OnboardingFlow.jsx
│       │   ├── dashboard/            # Main dashboard
│       │   │   ├── Dashboard.jsx
│       │   │   ├── CycleCountdown.jsx
│       │   │   ├── OvulationTracker.jsx
│       │   │   ├── CycleTrendsChart.jsx
│       │   │   ├── SymptomInsights.jsx
│       │   │   └── HealthAlerts.jsx
│       │   ├── tracker/              # Daily logging
│       │   │   ├── DailyLogger.jsx
│       │   │   └── QuickLogWidget.jsx
│       │   ├── insights/             # Analytics & trends
│       │   │   ├── AnalyticsPage.jsx
│       │   │   ├── CycleRegularity.jsx
│       │   │   ├── PainTrends.jsx
│       │   │   └── MoodCorrelation.jsx
│       │   ├── chatbot/              # AI assistant
│       │   │   ├── ChatWindow.jsx
│       │   │   └── ChatBubble.jsx
│       │   └── lifestyle/            # Lifestyle intelligence
│       │       ├── LifestylePage.jsx
│       │       ├── HormonalPhase.jsx
│       │       └── Recommendations.jsx
│       ├── components/               # Shared UI components
│       │   ├── Layout.jsx
│       │   ├── Sidebar.jsx
│       │   ├── Header.jsx
│       │   ├── Card.jsx
│       │   ├── Modal.jsx
│       │   └── Charts/
│       │       ├── LineChart.jsx
│       │       ├── BarChart.jsx
│       │       └── RadialChart.jsx
│       ├── hooks/
│       │   ├── useAuth.js
│       │   └── useCycleData.js
│       ├── context/
│       │   └── AuthContext.jsx
│       └── styles/
│           ├── index.css             # Global styles & design system
│           └── variables.css         # CSS custom properties
│
└── README.md
```

---

## Phased Development Plan

### Phase 1: Foundation & Core Backend (Week 1)
**Goal**: Django project setup, user auth, data models, basic API

#### Backend Setup
- [NEW] Django project with split settings (base/dev/prod)
- [NEW] `apps/accounts/` — Custom user model with profile fields (age, weight, lifestyle)
- [NEW] `apps/tracker/` — Core models:
  - `CycleLog` (start_date, end_date, cycle_length, period_length)
  - `DailyLog` (date, period_status, pain_level, mood, flow, sleep_hours, stress_level, exercise)
  - `Symptom` (linked to DailyLog, category, severity)
- [NEW] JWT authentication (djangorestframework-simplejwt)
- [NEW] REST API endpoints for all CRUD operations
- [NEW] Onboarding API (accepts historical cycle data)

#### Frontend Foundation
- [NEW] React + Vite project setup
- [NEW] Design system (CSS custom properties, dark mode, glassmorphism)
- [NEW] Auth pages (Login, Register) with premium UI
- [NEW] Multi-step Onboarding flow
- [NEW] API client (Axios with JWT interceptors)

#### Deliverable
Working auth flow + data entry + onboarding wizard

---

### Phase 2: ML Engine & Dashboard (Week 2)
**Goal**: Prediction engine, analytics dashboard, daily logging

#### ML Pipeline
- [NEW] `preprocessing.py` — Feature engineering (cycle stats, symptom encoding)
- [NEW] `train_baseline.py` — Linear regression model (cycle length prediction)
- [NEW] `ml_engine.py` — Model loading, inference API
- [NEW] Prediction endpoints (next period, ovulation window, confidence score)

#### Dashboard
- [NEW] Main dashboard with:
  - Next period countdown (circular progress)
  - Ovulation window tracker
  - Cycle trends chart (Recharts)
  - Symptom insights cards
  - Health alerts panel
- [NEW] Daily logging UI (1-minute input design):
  - Period status toggle
  - Pain slider (0–5)
  - Mood selector (emoji-based)
  - Flow intensity picker
  - Lifestyle quick inputs (sleep, stress, exercise)
- [NEW] Quick log widget with smart suggestions

#### Deliverable
Working prediction engine + beautiful dashboard + daily tracker

---

### Phase 3: Intelligence Layer (Week 3)
**Goal**: Risk detection, insights, recommendations, AI chatbot

#### Insight & Risk Engine
- [NEW] `rules_engine.py` — Rule-based risk detection:
  - Cycle irregularity detection (variance > threshold)
  - Pain pattern analysis (consistent high pain → alert)
  - Flow anomaly detection
  - PCOS risk indicators
  - Anemia risk indicators
- [NEW] `recommendation.py` — Personalized suggestions:
  - Diet recommendations per hormonal phase
  - Workout intensity suggestions
  - Productivity tips
  - Sleep optimization

#### Hormonal Phase Intelligence
- [NEW] Phase detection logic (Menstrual → Follicular → Ovulation → Luteal)
- [NEW] Phase-specific UI with colors, tips, and recommendations
- [NEW] `LifestylePage.jsx` — Comprehensive lifestyle dashboard

#### AI Chatbot
- [NEW] `llm_service.py` — Swappable LLM provider interface
- [NEW] `rag_engine.py` — Retrieves user's cycle data + medical knowledge
- [NEW] Chat API endpoints
- [NEW] `ChatWindow.jsx` — Beautiful chat UI with:
  - Typing indicators
  - Markdown rendering
  - Quick action buttons
  - Context-aware suggestions

#### Analytics Page
- [NEW] Deep analytics with:
  - Cycle regularity score (radial chart)
  - Pain trends over time
  - Mood-cycle correlation heatmap
  - Flow pattern analysis
  - Stress-cycle impact visualization

#### Deliverable
Full intelligence layer + chatbot + deep analytics

---

### Phase 4: Advanced ML & Polish (Week 4)
**Goal**: LSTM model, smart notifications, continuous learning

#### Advanced ML
- [NEW] `train_lstm.py` — LSTM model for sequence-based prediction
- [NEW] Model selection API (auto-pick best model per user)
- [NEW] Confidence scoring and explainability
- [NEW] Continuous learning pipeline (periodic retraining)

#### Smart Notifications
- [NEW] Dynamic period reminders (not static, based on predictions)
- [NEW] Ovulation alerts
- [NEW] Health warning notifications
- [NEW] "Log today's symptoms" reminders with smart pre-fill

#### Conversational Input
- [NEW] NLP parsing of natural language symptoms:
  - "I feel severe cramps today" → structured DailyLog entry
  - "My period started" → auto-create CycleLog

#### UI Polish
- Micro-animations throughout
- Loading skeletons
- Responsive mobile design
- Accessibility improvements

#### Deliverable
Production-quality application with advanced ML

---

### Phase 5: Production & Deployment (Week 5)
**Goal**: Production hardening, Celery/Redis, deployment

> [!NOTE]
> This phase is optional for the initial build. We can focus on Phases 1–4 first.

- PostgreSQL migration
- Celery + Redis for async tasks
- Docker containerization
- CI/CD pipeline
- Rate limiting & security hardening

---

## Data Models (Key Schemas)

### UserProfile
| Field | Type | Description |
|-------|------|-------------|
| user | FK → User | Django auth user |
| date_of_birth | Date | Age calculation |
| weight | Float | Optional |
| height | Float | Optional |
| avg_cycle_length | Int | Self-reported or calculated |
| onboarding_complete | Bool | Has finished setup |

### CycleLog
| Field | Type | Description |
|-------|------|-------------|
| user | FK → User | Owner |
| start_date | Date | Period start |
| end_date | Date | Period end (nullable) |
| cycle_length | Int | Days (calculated) |
| period_length | Int | Days of bleeding |
| is_predicted | Bool | ML-predicted vs actual |

### DailyLog
| Field | Type | Description |
|-------|------|-------------|
| user | FK → User | Owner |
| date | Date | Log date |
| period_status | Enum | none/started/ongoing/ended |
| pain_level | Int | 0–5 scale |
| mood | Enum | happy/calm/low/irritated/anxious |
| flow_intensity | Enum | none/light/medium/heavy |
| sleep_hours | Float | Hours slept |
| stress_level | Int | 0–5 scale |
| exercise_minutes | Int | Minutes of exercise |
| notes | Text | Free-form notes |

### PredictionResult
| Field | Type | Description |
|-------|------|-------------|
| user | FK → User | Owner |
| predicted_date | Date | Next period prediction |
| ovulation_date | Date | Estimated ovulation |
| fertile_window_start | Date | Fertile window start |
| fertile_window_end | Date | Fertile window end |
| confidence_score | Float | 0–1 confidence |
| model_version | String | Which model produced this |
| current_phase | Enum | menstrual/follicular/ovulation/luteal |

---

## Technology Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| Python 3.12 | Runtime |
| Django 5.x | Web framework |
| Django REST Framework | API layer |
| djangorestframework-simplejwt | JWT auth |
| django-cors-headers | CORS for React dev |
| scikit-learn | Baseline ML models |
| TensorFlow/Keras | LSTM model (Phase 4) |
| pandas / numpy | Data processing |
| SQLite (dev) → PostgreSQL (prod) | Database |

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| Vite | Build tool |
| React Router v6 | Routing |
| Axios | HTTP client |
| Recharts | Charts & analytics |
| Framer Motion | Animations |
| date-fns | Date utilities |

### Design System
- **Theme**: Dark mode primary with glassmorphism accents
- **Colors**: Deep purple/violet gradient palette (health/wellness feel)
- **Typography**: Inter (headings) + DM Sans (body)
- **Effects**: Glass cards, subtle glow effects, smooth transitions

---

## Open Questions

> [!IMPORTANT]
> 1. **LLM Provider**: Which LLM do you want for the chatbot? (OpenAI / Gemini / Local)
> 2. **Deployment Target**: Where do you plan to deploy? (Render, Railway, AWS, local only?)
> 3. **Phase Priority**: Should we build all 4 phases, or start with Phase 1–2 and iterate?
> 4. **Mobile**: Is mobile responsiveness sufficient, or do you want a React Native app later?

---

## Verification Plan

### Automated Tests
- Django unit tests for all API endpoints
- ML model accuracy tests (MAE < 3 days for baseline)
- Frontend component rendering tests
- API integration tests

### Manual Verification
- Browser walkthrough of full user flow (onboarding → logging → dashboard → chatbot)
- ML prediction accuracy check against known cycle data
- Responsive design verification at multiple breakpoints
- Performance profiling (page load < 2s)

### Browser Testing
- Complete auth flow (register → login → onboarding)
- Daily logging workflow
- Dashboard data display
- Chatbot conversation
- Analytics visualization
