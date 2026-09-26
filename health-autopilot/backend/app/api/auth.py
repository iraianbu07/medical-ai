from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import structlog

from app.database import get_db
from app.models import User, RefreshToken
from app.schemas import RegisterRequest, LoginRequest, TokenResponse
from app.core.security import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, hash_refresh_token, refresh_token_expiry, decode_access_token
)
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])
logger = structlog.get_logger()


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> User:
    """Dependency: extract and validate access token from Authorization header or cookie."""
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]

    if not token:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)):
    # Check email uniqueness
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name,
    )
    db.add(user)
    await db.flush()

    return await _issue_tokens(user, response, db)


@router.post("/login")
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return await _issue_tokens(user, response, db)


@router.post("/refresh")
async def refresh_token(
    response: Response,
    refresh_token_cookie: Optional[str] = Cookie(None, alias="refresh_token"),
    db: AsyncSession = Depends(get_db)
):
    if not refresh_token_cookie:
        raise HTTPException(status_code=401, detail="No refresh token")

    token_hash = hash_refresh_token(refresh_token_cookie)
    result = await db.execute(
        select(RefreshToken).where(
            and_(
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked == False,
                RefreshToken.expires_at > datetime.utcnow()
            )
        )
    )
    db_token = result.scalar_one_or_none()
    if not db_token:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    # Rotate refresh token (revoke old, issue new)
    db_token.revoked = True
    user_result = await db.execute(select(User).where(User.id == db_token.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return await _issue_tokens(user, response, db)


@router.post("/logout")
async def logout(
    response: Response,
    refresh_token_cookie: Optional[str] = Cookie(None, alias="refresh_token"),
    db: AsyncSession = Depends(get_db)
):
    if refresh_token_cookie:
        token_hash = hash_refresh_token(refresh_token_cookie)
        result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
        db_token = result.scalar_one_or_none()
        if db_token:
            db_token.revoked = True

    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}


@router.get("/google")
async def google_oauth_redirect():
    """Redirect to Google OAuth — requires GOOGLE_CLIENT_ID configured."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")

    from urllib.parse import urlencode
    params = urlencode({
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "scope": "openid email profile https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.sleep.read",
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent",
    })
    return {"auth_url": f"https://accounts.google.com/o/oauth2/v2/auth?{params}"}


async def _issue_tokens(user: User, response: Response, db: AsyncSession) -> dict:
    access_token = create_access_token({"sub": user.id, "email": user.email})
    raw_refresh, hashed_refresh = create_refresh_token()

    # Store refresh token
    db_refresh = RefreshToken(
        user_id=user.id,
        token_hash=hashed_refresh,
        expires_at=refresh_token_expiry()
    )
    db.add(db_refresh)

    # Set httpOnly cookies
    is_prod = settings.APP_ENV == "production"
    response.set_cookie(
        "access_token", access_token,
        httponly=True, secure=is_prod, samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    response.set_cookie(
        "refresh_token", raw_refresh,
        httponly=True, secure=is_prod, samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "onboarding_completed": user.onboarding_completed,
            "theme_preference": user.theme_preference,
            "plan": user.plan,
        }
    }
