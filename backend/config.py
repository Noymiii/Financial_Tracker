"""
CEIS Configuration — loads environment variables via pydantic-settings.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings sourced from .env file."""

    # Supabase
    supabase_url: str
    supabase_key: str
    supabase_jwt_secret: str

    # Telegram
    # Telegram
    telegram_bot_token: str

    # AI
    gemini_api_key: str | None = None
    openai_api_key: str | None = None

    # App
    app_env: str = "development"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton — reads .env once."""
    print("DEBUG: Loading settings from .env...")
    settings = Settings()
    # Print first few chars of secrets to verify correct file is read
    print(f"DEBUG: Loaded SUPABASE_KEY: {settings.supabase_key[:10]}...")
    print(f"DEBUG: Loaded JWT_SECRET: {settings.supabase_jwt_secret[:10]}...")
    return settings
