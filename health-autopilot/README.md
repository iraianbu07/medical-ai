# Health Autopilot OS

> An autonomous AI health decision engine that decides what you should do today — automatically.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend dev)
- Python 3.11+ (for local backend dev)

### One-command start

```bash
cd health-autopilot
cp .env.example .env
docker compose up --build
```

Then open: http://localhost:3000

### Seed demo data

```bash
docker compose exec backend python scripts/seed.py
```

Demo credentials:
- **Email:** `demo@autopilot.os`
- **Password:** `Demo1234!`

---

## 🏗 Architecture

```
nginx (port 80) → frontend (Next.js, port 3000)
               → backend (FastAPI, port 8000)
                  → PostgreSQL (db)
                  → Redis (cache + Celery broker)
                  → Celery Worker (nightly jobs)
                  → Celery Beat (scheduler)
```

## 📁 Project Structure

```
health-autopilot/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers
│   │   ├── core/         # Engines: behavior, decision, narrative, ML
│   │   ├── celery_app/   # Background tasks
│   │   ├── models.py     # SQLAlchemy ORM models
│   │   ├── schemas.py    # Pydantic schemas
│   │   ├── config.py     # Environment configuration
│   │   ├── database.py   # Async DB session
│   │   └── main.py       # FastAPI app entrypoint
│   ├── scripts/
│   │   ├── seed.py       # Demo data seeder
│   │   └── init_db.sql   # PostgreSQL extensions
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/          # Next.js 14 App Router pages
│       ├── components/   # UI + health components
│       ├── lib/          # API client, theme utilities
│       └── styles/       # Global CSS design system
├── ml/
│   ├── trainer.py        # ML training pipeline
│   └── inference.py      # Inference with fallbacks
├── nginx/
│   └── nginx.conf
└── docker-compose.yml
```

## 🔑 Core Engines

| Engine | File | Purpose |
|--------|------|---------|
| Behavior Detection | `core/behavior_engine.py` | 8 rule patterns, 3 severity levels |
| Decision Engine | `core/decision_engine.py` | ≤3 daily recommendations, priority stack |
| Narrative Engine | `core/narrative_engine.py` | NLG daily briefing, typewriter UX |
| NLP Parser | `core/nlp_parser.py` | Voice log intent detection |
| Health Score | `core/health_score.py` | 4-pillar 0-100 score |
| ML Inference | `ml/inference.py` | Fatigue, mood, productivity, score predictions |

## 📊 Behavior Rules

1. **Sleep Debt** — Severity 1-3 based on consecutive nights under target
2. **Low Activity** — Severity 1-2 based on consecutive low-step days  
3. **Late Night Usage** — Screen > 60min after 10 PM for 3+ days
4. **Irregular Routine** — Sleep start variance > 2 hours std dev
5. **Recovery Needed** — Low mood + low steps 2 days in a row
6. **Chronic Stress** — Stress 4+ for 3 days or 5/5 for 2 days
7. **Dehydration Risk** — Under 4 cups for 3 consecutive days

## 🎨 Design System

4 themes: **Midnight** (default) · **Solar** · **Aura** · **Arctic**

- No pure black backgrounds
- Fluid type scale (clamp-based)
- 4-level surface depth
- Custom SVG charts (no Recharts/Chart.js)

## 🔐 Security

- JWT access tokens (15min) + refresh tokens (7 days, httpOnly cookies)
- bcrypt 12 rounds password hashing
- Refresh token rotation + revocation
- Rate limiting via slowapi
- CORS, security headers via Nginx

## 📡 API Docs

Visit: http://localhost:8000/api/docs (Swagger UI)

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and configure:

- `JWT_SECRET_KEY` — Change in production
- `STRIPE_SECRET_KEY` — Optional, for Pro billing
- `GOOGLE_CLIENT_ID` — Optional, for Google Fit sync
- `VAPID_PRIVATE_KEY` — Optional, for Web Push

## 🧪 Running Tests

```bash
# Backend
docker compose exec backend pytest

# Frontend
cd frontend && npm test
```
