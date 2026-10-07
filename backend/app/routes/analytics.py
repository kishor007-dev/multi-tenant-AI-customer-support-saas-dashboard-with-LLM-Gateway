"""
app/routes/analytics.py
API endpoints for fetching dashboard statistics (Usage & Tickets).
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

# Use your existing organizations collection to grab the database connection
from app.db.organizations import organizations_collection
from app.dependencies.rate_limit import verify_org_rate_limit

router = APIRouter(prefix="/analytics", tags=["analytics"])

DAYS_LOOKBACK = 30


def get_db():
    return organizations_collection.database


@router.get("/usage")
async def get_usage_analytics(
    current_user: dict = Depends(verify_org_rate_limit),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Returns daily token/cost usage for the authenticated org over the last 30 days."""
    now = datetime.now(timezone.utc)
    start_date = (now - timedelta(days=DAYS_LOOKBACK - 1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    pipeline = [
        {
            "$match": {
                "org_id": current_user["org_id"],
                "created_at": {"$gte": start_date, "$lte": now},
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": "$created_at",
                        "timezone": "UTC",
                    }
                },
                "prompt_tokens": {"$sum": "$prompt_tokens"},
                "completion_tokens": {"$sum": "$completion_tokens"},
                "cost": {"$sum": "$cost"},
            }
        },
        {"$sort": {"_id": 1}},
    ]

    results = await db.UsageLogs.aggregate(pipeline).to_list(length=DAYS_LOOKBACK)

    # --- FIX: Dynamic Cost Calculation ---
    # Define your model pricing here. Example uses GPT-4o-mini ($0.150/1M input, $0.600/1M output)
    PRICE_PER_PROMPT_TOKEN = 0.150 / 1_000_000
    PRICE_PER_COMPLETION_TOKEN = 0.600 / 1_000_000

    usage_by_date = {}
    for row in results:
        prompt = row.get("prompt_tokens", 0)
        comp = row.get("completion_tokens", 0)
        
        # Check if cost exists in DB, otherwise calculate it dynamically
        db_cost = row.get("cost", 0)
        calculated_cost = (prompt * PRICE_PER_PROMPT_TOKEN) + (comp * PRICE_PER_COMPLETION_TOKEN)
        final_cost = db_cost if db_cost > 0 else calculated_cost

        usage_by_date[row["_id"]] = {
            "prompt_tokens": prompt,
            "completion_tokens": comp,
            "cost": round(final_cost, 4),
        }

    series = []
    for i in range(DAYS_LOOKBACK):
        day = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        stats = usage_by_date.get(
            day, {"prompt_tokens": 0, "completion_tokens": 0, "cost": 0.0}
        )
        series.append({"date": day, **stats})

    return {"org_id": str(current_user["org_id"]), "days": DAYS_LOOKBACK, "usage": series}


@router.get("/summary")
async def get_analytics_summary(
    current_user: dict = Depends(verify_org_rate_limit),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Returns ticket totals, open/resolved ratios, and a 7-day creation trend using flexible ID filters."""
    org_id_str = str(current_user["org_id"])
    
    org_filters = [org_id_str]
    if ObjectId.is_valid(org_id_str):
        org_filters.append(ObjectId(org_id_str))

    base_match = {"org_id": {"$in": org_filters}}

    status_pipeline = [
        {"$match": base_match},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    status_counts = await db.tickets.aggregate(status_pipeline).to_list(length=100)
    
    now = datetime.now(timezone.utc)
    seven_days_ago = (now - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
    thirty_days_ago = (now - timedelta(days=DAYS_LOOKBACK - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    
    trend_pipeline = [
        {"$match": {
            **base_match, 
            "created_at": {"$gte": seven_days_ago}
        }},
        {"$group": {
            "_id": {
                "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at", "timezone": "UTC"}
            },
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    trend_data = await db.tickets.aggregate(trend_pipeline).to_list(length=10)
    trend_by_date = {t["_id"]: t["count"] for t in trend_data}

    # 🔥 New: Count Active Conversations across all projects for this organization
    active_conversations_count = await db.conversations.count_documents({
        **base_match,
        "updated_at": {"$gte": thirty_days_ago}
    })

    metrics = {
        "total_tickets": 0,
        "open_tickets": 0,
        "resolved_tickets": 0,
        "active_conversations": active_conversations_count, # 🔥 Injected into response
        "trend": []
    }

    for status in status_counts:
        count = status["count"]
        metrics["total_tickets"] += count
        
        status_name = str(status["_id"]).lower()
        if status_name in ["open", "in_progress", "pending"]:
            metrics["open_tickets"] += count
        elif status_name in ["resolved", "closed", "done"]:
            metrics["resolved_tickets"] += count

    for i in range(7):
        day_str = (seven_days_ago + timedelta(days=i)).strftime("%Y-%m-%d")
        metrics["trend"].append({
            "date": day_str,
            "count": trend_by_date.get(day_str, 0)
        })

    return metrics
