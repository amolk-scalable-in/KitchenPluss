from fastapi import APIRouter
from datetime import datetime, timezone
from .. import __version__
from ..config import settings
from ..db.session import check_db_connectivity

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    """Liveness & readiness probe returning operational state, version, and database connectivity."""
    db_health = await check_db_connectivity()
    overall_status = "ok" if db_health.get("connected") else "degraded"

    return {
        "status": overall_status,
        "service": "kitchenpulse-ai-agent",
        "version": __version__,
        "environment": settings.environment,
        "database": db_health,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
