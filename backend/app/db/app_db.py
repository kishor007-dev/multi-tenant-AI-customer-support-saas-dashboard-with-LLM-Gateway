import os
from motor.motor_asyncio import AsyncIOMotorClient

# Fetch the URL from the environment, defaulting to localhost if not found
mongodb_url = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")

client = AsyncIOMotorClient(mongodb_url)
db = client["app_db"]
