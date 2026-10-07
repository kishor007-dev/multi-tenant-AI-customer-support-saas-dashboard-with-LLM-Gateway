"""
app/services/analytics_service.py
MongoDB aggregation pipelines for dashboard metrics.
"""

from datetime import datetime, timedelta
from bson import ObjectId

# Adjust this import to match where your tickets collection is defined
from app.db.collections import db

async def get_dashboard_metrics(org_id: str) -> dict:
    """
    Calculates total tickets, open/resolved ratios, and a 7-day trend array.
    """
    tickets_collection = db["tickets"]
    base_match = {"org_id": ObjectId(org_id)}

    # 1. Aggregate Ticket Statuses (Open, Resolved, etc.)
    status_pipeline = [
        {"$match": base_match},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    status_counts = await tickets_collection.aggregate(status_pipeline).to_list(length=100)
    
    # 2. Aggregate 7-Day Ticket Creation Trend
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    trend_pipeline = [
        {"$match": {
            **base_match, 
            "created_at": {"$gte": seven_days_ago}
        }},
        {"$group": {
            "_id": {
                "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
            },
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    trend_data = await tickets_collection.aggregate(trend_pipeline).to_list(length=10)

    # 3. Format the response for the frontend UI
    metrics = {
        "total_tickets": 0,
        "open_tickets": 0,
        "resolved_tickets": 0,
        "trend": [{"date": t["_id"], "count": t["count"]} for t in trend_data]
    }

    for status in status_counts:
        count = status["count"]
        metrics["total_tickets"] += count
        
        # Categorize statuses (adjust strings based on your specific status enums)
        if status["_id"] in ["open", "in_progress", "pending"]:
            metrics["open_tickets"] += count
        elif status["_id"] in ["resolved", "closed", "done"]:
            metrics["resolved_tickets"] += count

    return metrics
