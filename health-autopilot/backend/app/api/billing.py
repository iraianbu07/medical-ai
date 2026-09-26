import stripe
from fastapi import APIRouter, Request, HTTPException, Depends
from app.config import settings
from app.api.auth import get_current_user
from app.models import User
from app.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/billing", tags=["billing"])

stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/checkout")
async def create_checkout_session(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create Stripe checkout session for Pro plan."""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=501, detail="Billing not configured")

    if current_user.plan == "pro":
        return {"message": "Already Pro"}

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{"price": settings.STRIPE_PRO_PRICE_ID, "quantity": 1}],
        mode="subscription",
        customer_email=current_user.email,
        success_url=f"{settings.NEXT_PUBLIC_APP_URL}/settings?upgraded=true",
        cancel_url=f"{settings.NEXT_PUBLIC_APP_URL}/settings",
        metadata={"user_id": current_user.id},
    )
    return {"checkout_url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        if user_id:
            from sqlalchemy import select
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user:
                user.plan = "pro"
                user.stripe_customer_id = session.get("customer")
                await db.flush()

    elif event["type"] == "customer.subscription.deleted":
        customer_id = event["data"]["object"].get("customer")
        if customer_id:
            from sqlalchemy import select
            result = await db.execute(select(User).where(User.stripe_customer_id == customer_id))
            user = result.scalar_one_or_none()
            if user:
                user.plan = "free"
                await db.flush()

    return {"status": "handled"}
