import logging
from motor.motor_asyncio import AsyncIOMotorDatabase
import pymongo

logger = logging.getLogger("LLMGatewayInit")


async def ensure_usage_log_indexes(db: AsyncIOMotorDatabase):
    """
    Idempotent index creation for the LLM Gateway Usage Logs.
    Executes asynchronously on application startup.
    """
    try:
        collection = db["UsageLogs"]

        # 1. Analytics & range queries
        await collection.create_index(
            [("org_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)],
            name="idx_org_created_at",
        )

        # 2. Per-provider structural breakdowns
        await collection.create_index(
            [("org_id", pymongo.ASCENDING), ("provider", pymongo.ASCENDING)],
            name="idx_org_provider",
        )

        # 3. Per-user cost audits
        await collection.create_index(
            [("user_id", pymongo.ASCENDING)],
            name="idx_user_id",
        )

        # 4. Conversation-level budget tracking
        await collection.create_index(
            [("conversation_id", pymongo.ASCENDING)],
            name="idx_conversation_id",
        )

        logger.info("Successfully verified/created all LLM Gateway MongoDB indexes.")
    except Exception as e:
        logger.error(f"Failed to initialize database indexes for LLM Gateway: {e}")
