from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime
from typing import Optional


class Plan(str, Enum):
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class OrgSettings(BaseModel):
    model_provider: str = "groq"   # fixed
    model_id: str = "llama-3.1-8b-instant"
    monthly_token_budget: int = 500000
    data_region: str = "us-east-1"


class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    slug: Optional[str] = Field(None, pattern=r"^[a-z0-9\-]+$")
    plan: Plan = Plan.STARTER
    settings: OrgSettings = Field(default_factory=OrgSettings)   # fixed


class OrganizationOut(BaseModel):
    id: str
    name: str
    slug: str
    plan: Plan
    settings: OrgSettings
    owner_id: str
    status: str = "active"
    created_at: datetime