"""
app/dependencies/budget.py
Dependency to verify an organization has sufficient LLM token budget before inference.
"""

from fastapi import Depends
from app.dependencies.auth import get_current_user
from app.services.subscription_service import enforce_token_budget

async def verify_org_budget(current_user: dict = Depends(get_current_user)):
    """
    Dependency that blocks AI requests if the organization has exceeded its monthly token allowance.
    By default, it assumes an estimated transaction of 1,000 tokens (prompt + completion buffer).
    Returns the user doc unchanged so it can be chained/reused downstream.
    """
    
    # 🔒 ENFORCE TOKEN BUDGET
    await enforce_token_budget(current_user["org_id"], estimated_tokens=1000)
    
    return current_user
