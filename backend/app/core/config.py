"""
Placeholder settings object so this module set runs standalone.
In the real codebase, delete this and import the existing `settings`
from app.core.config (Phase 1 already defines JWT_SECRET / JWT_ALGORITHM
and the Mongo connection string there).
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    JWT_SECRET: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "support_saas"

    model_config = {"env_file": ".env"}


settings = Settings()
