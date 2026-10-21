import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Search for .env files up the directory tree
current_dir = Path(__file__).resolve().parent
for candidate in [
    current_dir.parent / ".env",               # services/ai-agent/.env
    current_dir.parent.parent.parent / ".env", # KitchenPluss/.env
]:
    if candidate.exists():
        load_dotenv(candidate, override=False)

DEFAULT_DB_URL = "postgresql://postgres:admin@localhost:5432/kitchenpulse"

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    from pydantic import Field

    class Settings(BaseSettings):
        port: int = Field(default=8000, alias="PORT")
        host: str = Field(default="0.0.0.0", alias="HOST")
        environment: str = Field(default="development", alias="ENVIRONMENT")
        log_level: str = Field(default="info", alias="LOG_LEVEL")
        backend_url: str = Field(default="http://localhost:5000", alias="BACKEND_URL")
        database_url: str = Field(default=DEFAULT_DB_URL, alias="DATABASE_URL")
        db_pool_size: int = Field(default=5, alias="DB_POOL_SIZE")
        db_max_overflow: int = Field(default=10, alias="DB_MAX_OVERFLOW")
        db_pool_timeout: int = Field(default=30, alias="DB_POOL_TIMEOUT")
        gemini_api_key: Optional[str] = Field(default=None, alias="GEMINI_API_KEY")
        gemini_model: str = Field(default="gemini-3.8-flash", alias="GEMINI_MODEL")

        model_config = SettingsConfigDict(
            env_file=(".env", "../../.env"),
            env_file_encoding="utf-8",
            extra="ignore",
        )

        @property
        def async_database_url(self) -> str:
            """Convert standard postgresql:// URL to asyncpg format postgresql+asyncpg://."""
            url = self.database_url or DEFAULT_DB_URL
            if url.startswith("postgres://"):
                return "postgresql+asyncpg://" + url[len("postgres://"):]
            elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
                return "postgresql+asyncpg://" + url[len("postgresql://"):]
            return url

except ImportError:
    from pydantic import BaseModel

    class Settings(BaseModel):
        port: int = int(os.getenv("PORT", "8000"))
        host: str = os.getenv("HOST", "0.0.0.0")
        environment: str = os.getenv("ENVIRONMENT", "development")
        log_level: str = os.getenv("LOG_LEVEL", "info")
        backend_url: str = os.getenv("BACKEND_URL", "http://localhost:5000")
        database_url: str = os.getenv("DATABASE_URL", DEFAULT_DB_URL)
        db_pool_size: int = int(os.getenv("DB_POOL_SIZE", "5"))
        db_max_overflow: int = int(os.getenv("DB_MAX_OVERFLOW", "10"))
        db_pool_timeout: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
        gemini_api_key: Optional[str] = os.getenv("GEMINI_API_KEY")
        gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

        @property
        def async_database_url(self) -> str:
            """Convert standard postgresql:// URL to asyncpg format postgresql+asyncpg://."""
            url = self.database_url or DEFAULT_DB_URL
            if url.startswith("postgres://"):
                return "postgresql+asyncpg://" + url[len("postgres://"):]
            elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
                return "postgresql+asyncpg://" + url[len("postgresql://"):]
            return url


settings = Settings()
