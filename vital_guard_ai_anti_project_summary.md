# 🏥 Healthcare Project — Complete Technical Summary

> **Two full-stack healthcare systems built in this workspace:**
> 1. **VITAL-GUARD AI** — ICU clinical deterioration monitoring (completed)
> 2. **Health Autopilot OS** — Personal consumer health OS (advanced, partially complete)

---

## PART 1 — VITAL-GUARD AI
**Location:** `d:\anti-gravity-da\backend` + `d:\anti-gravity-da\frontend`

### What It Is
Hospital-grade ICU monitoring app for **early clinical deterioration detection**. Patients log vital signs; AI predicts risk, sends email alerts, and displays everything on a futuristic dark dashboard.

---

### Database (SQLite via SQLAlchemy ORM)
4 tables, all timestamps in IST (UTC+5:30):

| Table | Key Fields |
|---|---|
| `patients` | patient_id, password_hash, name, age, gender, conditions, risk_level |
| `vitals` | heart_rate, spo2, temperature, respiratory_rate, systolic_bp, diastolic_bp, vgi, risk_category, estimated_hours_to_deterioration |
| `devices` | name, device_type, status, battery_level, latency_ms |
| `events` | event_type, message, severity (info/warning/critical) |

---

### Authentication (`auth.py`)
- JWT (HS256, 24-hour tokens) via `python-jose`
- bcrypt password hashing
- `POST /auth/register` → creates patient, returns token
- `POST /auth/login` → validates password, returns token
- `get_current_patient` dependency injected into all protected routes

---

### The VGI Engine — Core AI (`vitals.py`)
**VitalGuard Index (VGI)** = proprietary 0–100 risk score:

```
VGI = (base_risk × 0.55) + (trend_risk × 0.25) + (baseline_deviation_risk × 0.20)
```

**Base Risk** (physiological thresholds):
- Heart Rate: +30 if >130/<45 | +18 if >110/<55 | +8 if >100/<60
- SpO₂: +35 if <85% | +25 if <90% | +15 if <93% | +8 if <95%
- Temperature: +25 if >40°C/<34.5°C | +15 if >39°C/<35.5°C
- Respiratory Rate: +30 if >35/<8 | +18 if >28/<10 | +8 if >22/<12
- Systolic BP: +25 if <70/>200 | +15 if <85/>180 | +8 if <95/>160
- Diastolic BP: +15 if <45/>120 | +8 if <55/>100

**Trend Risk** (last 3 readings):
- HR rising >15 bpm → +10 | SpO₂ falling >3% → +15 | RR rising >5 → +10 | SBP falling >15 → +10

**Baseline Deviation** (last 5 readings — personal average):
- HR deviation >30 → +10 | SpO₂ drop >5% → +10 | SBP drop >20 → +8

---

### Medical Classification — 9 Categories
Diagnosed by physiological pattern, NOT just score threshold:

| Category | Trigger Pattern |
|---|---|
| Hemodynamic Shock | SBP <80 + HR >110 |
| Critical Deterioration | Multiple critical values + VGI ≥70 |
| Multi-Organ Risk | ≥3 organ systems abnormal |
| Sepsis / SIRS | Temp abnormal + ≥2 SIRS criteria |
| Cardiac Risk | HR abnormal AND BP abnormal |
| Respiratory Failure | SpO₂ <92% or (SpO₂ <95% + RR >24) |
| Hypertensive Crisis | SBP >180 or DBP >120 |
| Mild Abnormality | Any single deviation |
| Stable | All within normal ranges |

Each classification outputs: clinical reasoning text, estimated hours to deterioration, 12-hour risk timeline (projected VGI at 0/2/4/6/8/10/12h), explanation factors with clinical notes per vital.

---

### API Endpoints (FastAPI v2.0.0)

| Route | Method | Purpose |
|---|---|---|
| /auth/register | POST | Register patient |
| /auth/login | POST | Login → JWT |
| /vitals/add | POST | Submit vitals → full VGI prediction |
| /vitals/history | GET | All past vitals |
| /prediction/current | GET | Latest prediction from last vital |
| /patients/profile | GET | Patient profile |
| /patients/update | PUT | Update name/age/gender/conditions |
| /devices/list | GET | Patient's devices |
| /devices/add | POST | Add device |
| /events/recent | GET | Last 20 events |
| /api/health | GET | Health check |

---

### Email Alert System (`email_service.py`)
- Triggers at **VGI ≥ 80**
- HTML + plain-text via Gmail SMTP (TLS port 587)
- Runs in background thread (non-blocking API response)
- Email content: Patient ID, VGI %, risk category, clinical reasoning, all 6 vitals, estimated hours, recommended action

---

### Frontend (React + Vite + TailwindCSS) — 9 Pages

| Page | Purpose |
|---|---|
| LoginPage | JWT auth form |
| RegisterPage | New patient registration |
| Dashboard | Main monitoring hub (558 lines) |
| HistoryPage | Past vitals table |
| PatientsPage | Profile editor |
| DeviceStatusPage | Device management |
| EventsTimelinePage | Audit event feed |
| LiveMonitorPage | Real-time vitals stream |
| AIInsightsPage | Emergency simulation & analysis |

**Components:** `Sidebar.jsx` (navigation), `ReportModal.jsx` (printable clinical PDF)

---

### Dashboard Features (inch-by-inch)
1. **4 Vital Cards** — HR, SpO₂, Temp, RR with Normal/Abnormal/Critical badge
2. **VGI Card** — Animated number, SVG ring gauge, animated human body SVG (heart pulse, lung outline), progress bar
3. **AI Recommendations** — 3 priority-tagged actions (HIGH/MEDIUM/LOW)
4. **Risk Timeline Chart** — Chart.js 12-hour dual-line forecast (actual + predicted)
5. **AI Prediction Explanation** — Factor bars with clinical notes
6. **Patient Profile Card** — Name, age, gender, conditions, risk badge
7. **Device Status** — Up to 3 devices with status/battery/latency
8. **Quick Actions** — Emergency Simulation, Generate Report, Export Data
9. **Recent Events Feed** — Last 4 events with IST timestamp
10. **Submit Vitals Form** — 6-field form → full VGI analysis on submit
11. **Critical Alert Banner** — Red animated banner, "Acknowledge" button, "Email sent" notice
12. **Auto-refresh** every 10 seconds

---

### Report Modal (`ReportModal.jsx`)
Printable clinical document:
- VITAL-GUARD AI header + issue timestamp
- Patient info block (name, ID, age, gender, risk level, conditions)
- VGI score with severity color bar
- AI Clinical Reasoning text
- Primary Factors table (factor, value, severity)
- All 6 vital signs snapshot
- 12-hour risk projection chart (print-friendly Chart.js)
- Physician signature blocks
- Custom `@media print` CSS — hides everything except report

---

### Deployment
- Backend Dockerized, served via uvicorn
- Frontend built to `/backend/static/` — FastAPI serves SPA
- Single-URL: all traffic through `http://server:8000`

---
---

## PART 2 — HEALTH AUTOPILOT OS
**Location:** `d:\anti-gravity-da\health-autopilot`

### What It Is
Consumer-grade personal health OS — daily lifestyle monitoring, nightly behavior detection, ≤3 hyper-personalized daily recommendations, composite Health Score. Free vs Pro subscription via Stripe.

---

### Architecture (Docker Compose — 7 services)
```
Nginx:80 → Next.js:3000 + FastAPI:8000
                  ↓
         PostgreSQL:5432  Redis:6379
         Celery Worker    Celery Beat
         ML Trainer
```

---

### Database (PostgreSQL + SQLAlchemy async) — 8 Tables

| Table | Key Fields |
|---|---|
| users | email, password_hash, plan (free/pro), timezone, primary_goal, google_fit_token, stripe_customer_id, privacy_mode |
| refresh_tokens | token_hash, expires_at, revoked |
| daily_metrics | date, steps, sleep_hours, sleep_start_time, screen_time_minutes, calories_estimated, mood_score(1-5), energy_level(1-5), stress_level(1-5), hydration_cups, data_confidence_score, weather_condition |
| behavior_flags | flag_type, severity(1-3), active, times_escalated, detected_at |
| recommendations | date, action, reason, confidence, category, accepted, snoozed_until, dismissed, times_shown, weather_influenced |
| health_score_history | date, score(0-100), score_breakdown(JSON), predicted_tomorrow |
| events | event_type, description, parsed_data(JSON) |
| user_achievements | achievement_type, unlocked_at, seen |
| weekly_insights | week_start, summary_text, top_win, top_risk, score_change |

---

### Health Score Engine (`app/core/health_score.py`)
```
Sleep(30) + Activity(25) + Mental(25) + Nutrition(20) = 100
```

**Sleep** (optimal 7-9h): 7-9h→30 | 6-7h→22 | 9-10h→26 | 5-6h→14 | >10h→20 | <5h→6. Inferred sleep ×0.85.

**Activity** (optimal 8000+ steps): ≥10000→25 | ≥8000→22 | ≥6000→18 | ≥4000→13 | ≥2000→8 | ≥1000→4

**Mental** (mood 10pts + stress-inverted 10pts + energy 5pts):
- Mood map: {1:0, 2:3, 3:6, 4:8.5, 5:10}
- Stress inverted: {1:10, 2:8, 3:6, 4:3, 5:0}
- Energy: {1:0, 2:1.5, 3:3, 4:4, 5:5}

**Nutrition**: hydration ≥8→12 | ≥6→9 | ≥4→6 | ≥2→3. Calories 1500-2500→8pts.

**Data Confidence** (0.0-1.0): Steps API+0.25 | Sleep API+0.25 | Mood+0.20 | Hydration+0.10 | Stress+0.05

---

### Behavior Detection Engine (`app/core/behavior_engine.py`)
Runs nightly via Celery. 7 rules on last 10 days:

| Rule | Trigger | Severity |
|---|---|---|
| sleep_debt | 2 consecutive nights <5h | 3 |
| sleep_debt | 3 of 5 nights <6h | 2 |
| low_activity | 3 consecutive days <1500 steps | 2 |
| low_activity | 4 of 7 days <3000 steps | 1 |
| late_night_usage | Screen >60min + sleep after 22:00 on 3/5 nights | 2 |
| irregular_routine | Sleep time std deviation >2h over 5 nights | 1 |
| recovery_needed | Mood ≤2 AND steps <2000 for 2 consecutive days | 3 |
| chronic_stress | Stress=5/5 for 2 consecutive days | 3 |
| chronic_stress | Stress ≥4/5 for 3 consecutive days | 2 |
| dehydration_risk | <4 cups for 3 consecutive days | 1 |

Auto-resolve: flags not triggered in 3+ days are resolved. Escalation: flag shown 3+ times → escalated stronger template.

---

### Decision Engine (`app/core/decision_engine.py`)
Produces ≤3 recommendations/day (no duplicate categories).

**Priority stack:**
1. Severity-3 flags
2. ML signals (fatigue_risk >0.7 or predicted_mood <2.5)
3. Severity-2 flags
4. User's primary goal
5. Severity-1 flags

**30+ action templates** with dynamic vars: `{bedtime}`, `{avg_sleep}`, `{cups_needed}`, `{activity_type}`, `{deadline}`, `{duration}`, `{times_shown}`.

**Weather adaptation**: rain/snow/storm → switches outdoor→indoor activities.

---

### NLG Narrative Engine (`app/core/narrative_engine.py`)
Pure Python, no LLM. Generates 2-3 sentence daily brief:
- S1: Highest-priority signal (critical flag / low score / low mood / excellent score)
- S2: ML prediction context (fatigue %, mood forecast, score delta)
- S3: Motivational close or actionable tip
- Outputs confidence label: "High confidence · 3 sources"

---

### NLP Voice Parser (`app/core/nlp_parser.py`)
Keyword-based intent detection:

| Intent | Example Input | Output |
|---|---|---|
| Hydration | "drank 3 glasses of water" | hydration_cups: 3 |
| Workout | "ran for 45 minutes" | calories: 525, steps: 6000 |
| Food log | "ate biryani for lunch" | calories: 700, type: high_carb |
| Stress | "feeling overwhelmed" | stress_level: 5 |
| Fatigue | "feeling drained" | energy_level: 2 |
| Mood | "feeling amazing" | mood_score: 4 |
| Sleep | "slept 7.5h" | sleep_hours: 7.5 |

25 food items in calorie DB. 15 workout types with calorie/step estimates.

---

### ML Pipeline (`ml/trainer.py` + `ml/inference.py`)
4 models, min 14 days data required. Falls back to rules if insufficient data.

| Model | Algorithm | Predicts |
|---|---|---|
| Fatigue Classifier | RandomForest (50 trees, class_weight=balanced) | Binary fatigue risk |
| Productivity Predictor | DecisionTree (depth 5) | morning/afternoon/evening peak window |
| Mood Forecaster | LinearRegression | Tomorrow's mood score (uses 5-day lags) |
| Score Predictor | GradientBoosting (100 trees, depth 3) | Tomorrow's health score |

SQL features: 3-day rolling steps/sleep averages, mood_lag1–5, sleep_start_hour — all computed via PostgreSQL window functions.

---

### API Routes (FastAPI async)

| Router | Prefix | Key Endpoints |
|---|---|---|
| Auth | /auth | register, login, refresh, logout |
| Users | /users | profile CRUD, onboarding, Google Fit token, privacy mode |
| Metrics | /metrics | daily submission, dashboard, check-in |
| Recommendations | /recommendations | today's recs, accept/snooze/dismiss/feedback |
| Events | /events | voice/text log, event feed |
| Achievements | /achievements | unlocked badges |
| Reports | /reports | score history (7d free/30d pro), Time Machine (pro), Weekly Insight, PDF |
| Export | /export | CSV export (pro only) |
| Billing | /billing | Stripe checkout, webhook |

---

### Billing (Stripe)
- Free: 7-day history only, no PDF/CSV/Time Machine
- Pro: 30-day history, Time Machine, PDF via reportlab, CSV export
- Stripe webhook: `checkout.session.completed` → sets user.plan="pro"; `subscription.deleted` → downgrades to free

---

### Frontend (Next.js 13 App Router + TypeScript + Tailwind)
11 routes: `/login`, `/onboarding`, `/dashboard`, `/check-in`, `/recommendations`, `/insights`, `/focus`, `/my-data`, `/reports`, `/achievements`, `/settings`

**`RecommendationCard.tsx`** (Framer Motion):
- Accept → flash green border → "Done! Streak +1 🔥" → collapses out
- Snooze → 2h countdown timer shown in card
- Dismiss → "Not relevant" → fades out
- Shows: category icon, action text, reason text, confidence %, weather-adapted chip, escalation badge

---

### Background Jobs
- Celery Worker: behavior detection nightly, ML retraining, weekly insight generation (Sundays)
- Celery Beat: scheduler (cron-style)
- Redis: broker (DB1), result backend (DB2), API cache (DB0)

---

## COMPARISON TABLE

| Feature | VITAL-GUARD AI | Health Autopilot OS |
|---|---|---|
| Target | ICU / hospital | Consumer / personal |
| Database | SQLite | PostgreSQL |
| Auth | JWT 24h | JWT + refresh tokens |
| AI Core | VGI rule engine | Behavior + Decision + ML |
| Frontend | React/Vite | Next.js 13/TypeScript |
| Alerts | Email (VGI≥80) | Push (planned) |
| Reports | Print/PDF modal | reportlab PDF (Pro) |
| Billing | None | Stripe Free/Pro |
| Infra | 1 Docker container | 7-service Docker Compose |
| Celery | No | Yes (nightly jobs) |
| ML Models | 1 | 4 |
| Voice Input | No | Yes |
| Weather | No | Yes |

---

## What's Built vs Missing

### VITAL-GUARD AI — Fully Complete ✅
- Auth, VGI engine, 9-category classification, email alerts, 9-page dashboard, printable reports, event logging, device tracking, Docker SPA deployment

### Health Autopilot OS — Backend Complete, Frontend Partial
- ✅ All 9 API routers, behavior detection (7 rules), decision engine, health score, NLG narrative, NLP parser, 4 ML models, Stripe billing, PDF reports, Docker Compose
- ✅ RecommendationCard, BottomTabBar components
- ❌ Most frontend pages (stubs/dirs exist, not fully implemented)
- ❌ Google Fit live sync (token field exists, sync not built)
- ❌ Push notifications

---

## Innovation Opportunities
1. Real-time WebSocket vitals (replace 10s polling)
2. LLM-powered reasoning (GPT/Gemini replacing template NLG)
3. Apple HealthKit / Google Fit live sync
4. Multi-patient nurse/doctor dashboard
5. HL7 FHIR compliance for data export
6. LSTM time-series anomaly detection for vitals
7. WhatsApp/SMS alerts alongside email
8. Medication reminder system
9. React Native mobile app
10. Federated ML across hospitals (privacy-preserving)
