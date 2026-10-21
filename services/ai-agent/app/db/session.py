import logging
import time
from typing import AsyncGenerator, Optional, Dict, Any
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy import text
from ..config import settings

logger = logging.getLogger("kitchenpulse.db")

_engine: Optional[AsyncEngine] = None
_session_factory: Optional[async_sessionmaker[AsyncSession]] = None


def get_async_engine() -> AsyncEngine:
    """Singleton getter for the SQLAlchemy asynchronous engine."""
    global _engine
    if _engine is None:
        logger.info("Initializing SQLAlchemy async engine with asyncpg driver...")
        _engine = create_async_engine(
            settings.async_database_url,
            pool_size=settings.db_pool_size,
            max_overflow=settings.db_max_overflow,
            pool_timeout=settings.db_pool_timeout,
            pool_pre_ping=True,
            echo=False,
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Singleton getter for async_sessionmaker."""
    global _session_factory
    if _session_factory is None:
        engine = get_async_engine()
        _session_factory = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _session_factory


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency yielding a tenant-safe SQLAlchemy AsyncSession.
    Automatically handles rollback on exceptions and cleanup upon completion.
    """
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
        except Exception as exc:
            await session.rollback()
            logger.error("Session transaction rolled back due to exception: %s", exc)
            raise
        finally:
            await session.close()


async def init_db() -> bool:
    """
    Verify database connectivity during microservice startup.
    Returns True if reachable, False otherwise (without raising fatal crashes).
    """
    try:
        engine = get_async_engine()
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("✅ PostgreSQL database connection established successfully via asyncpg.")
        return True
    except Exception as exc:
        logger.warning(
            "⚠️ Database initial connection check failed (%s). Microservice will start with fallback mode.",
            exc,
        )
        return False


async def close_db() -> None:
    """Gracefully dispose database connection pools on shutdown."""
    global _engine, _session_factory
    if _engine is not None:
        logger.info("Disposing SQLAlchemy async engine connection pool...")
        await _engine.dispose()
        _engine = None
        _session_factory = None
        logger.info("SQLAlchemy connection pool successfully released.")


async def check_db_connectivity() -> Dict[str, Any]:
    """
    Execute lightweight ping to measure database latency and connection health.
    """
    start_time = time.perf_counter()
    try:
        engine = get_async_engine()
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "connected": True,
            "latency_ms": elapsed_ms,
            "driver": "asyncpg",
            "url": settings.async_database_url.split("@")[-1],
        }
    except Exception as exc:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "connected": False,
            "latency_ms": elapsed_ms,
            "error": str(exc),
            "driver": "asyncpg",
        }
