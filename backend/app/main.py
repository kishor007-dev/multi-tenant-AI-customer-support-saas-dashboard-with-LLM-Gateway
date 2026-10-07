"""
app/main.py  –  Phase 1 & 2 complete.
FastAPI application entry point.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# ─── ROUTER IMPORTS ─────────────────────────────────────────────────────────
from app.routes.auth import router as auth_router
from app.routes.org import router as org_router
from app.routes.projects import router as project_router
from app.routes.audit_logs import router as audit_router
from app.routes.aichat import router as chat_router
from app.routes.kb_route import router as kb_router
from app.routes.invitation import router as invitation_router
from app.routes import analytics
from app.routes.llm_gateway_routes import router as gateway_router
from app.routes import tickets, escalation, ws_tickets
from app.routes import audit_logs

# ─── DB & GATEWAY IMPORTS ───────────────────────────────────────────────────
from app.llm_gateway import ensure_usage_log_indexes
from app.db.knowledge_base import kb_collections
from app.db.organizations import organizations_collection, create_org_indexes

# ─── LIFESPAN (STARTUP/SHUTDOWN) ────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Organization indexes (slug uniqueness is enforced at startup)
    await create_org_indexes()

    # 2. KB pre-filter index
    await kb_collections.create_index("org_id")

    # 3. Initialize LLM Gateway & Analytics Indexes
    # We grab the database connection directly from your existing collections
    db = organizations_collection.database
    await ensure_usage_log_indexes(db)
    
    # 🔥 FIX: Actually call the ticket indexes function during startup
    await ensure_ticket_indexes(db)
    
    yield
    # Shutdown logic goes here if needed


async def ensure_ticket_indexes(db) -> None:
    """
    Call this once at startup (same place Phase 1 creates its 18 indexes).
    org_id-first compound indexes because every query in ticket_service.py
    filters by org_id first.
    """
    await db["tickets"].create_index([("org_id", 1), ("status", 1)])
    await db["tickets"].create_index([("org_id", 1), ("created_at", -1)])
    await db["tickets"].create_index([("org_id", 1), ("assigned_to", 1)])
    await db["tickets"].create_index([("conversation_id", 1)])
# ─── APP INITIALIZATION ─────────────────────────────────────────────────────
# We initialize the app exactly ONCE and pass the lifespan function to it.
app = FastAPI(
    title="Multi-Tenant AI Customer Support SaaS",
    version="0.2.0",
    description="Phase 2 - implementing llm gateway",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── REGISTER ROUTERS ───────────────────────────────────────────────────────
app.include_router(auth_router)      # /auth/* 
app.include_router(org_router)       # /org/* 
app.include_router(project_router)   # /projects/*
app.include_router(audit_router)     # /audit-logs/*
app.include_router(chat_router)      # /chat/*
app.include_router(kb_router)        # /kb/*
app.include_router(invitation_router)
app.include_router(analytics.router) # /analytics/*

# Expose gateway under /api/v1/gateway/*
app.include_router(gateway_router, prefix="/api/v1")  
app.include_router(tickets.router, prefix="/api/v1")
app.include_router(escalation.router, prefix="/api/v1")
app.include_router(ws_tickets.router)  # no /api/v1 prefix — ws path is /ws/tickets
app.include_router(audit_logs.router,prefix="/api/v1")


