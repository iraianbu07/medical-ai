from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import structlog
import redis.asyncio as aioredis

from app.config import settings
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.metrics import router as metrics_router
from app.api.recommendations import router as recommendations_router
from app.api.events import router as events_router
from app.api.achievements import router as achievements_router
from app.api.reports import router as reports_router
from app.api.export import router as export_router
from app.api.billing import router as billing_router

logger = structlog.get_logger()

# Global Redis client (populated at startup)
redis_client = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client
    logger.info("Health Autopilot OS starting up")
    try:
        redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await redis_client.ping()
    except Exception as e:
        logger.warning(f"Could not connect to Redis: {e}")
        redis_client = None

    # Inject into redis_client module so all core modules share the same instance
    import app.core.redis_client as rc_module
    rc_module.redis_client = redis_client

    yield

    # Shutdown
    if redis_client:
        await redis_client.aclose()
    logger.info("Health Autopilot OS shut down")


# Rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Health Autopilot OS API",
    description="Autonomous health decision engine",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middleware — ORDER MATTERS: GZip must come before CORS
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(metrics_router)
app.include_router(recommendations_router)
app.include_router(events_router)
app.include_router(achievements_router)
app.include_router(reports_router)
app.include_router(export_router)
app.include_router(billing_router)


@app.get("/health", tags=["meta"])
async def health_check():
    return {
        "status": "healthy",
        "service": "health-autopilot-os",
        "version": "1.0.0"
    }


@app.get("/api/health", tags=["meta"])
async def api_health_check():
    return {"status": "ok"}
