import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import health_router, agent_router
from .db.session import init_db, close_db
from . import __version__

# Configure logging
logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("kitchenpulse-ai-agent")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for startup and shutdown."""
    logger.info("🚀 Starting KitchenPulse AI Agent microservice on port %s", settings.port)
    logger.info("Environment: %s | Backend URL: %s", settings.environment, settings.backend_url)
    # Initialize database connection pool
    await init_db()
    yield
    # Gracefully dispose database pool
    await close_db()
    logger.info("🛑 Shutting down KitchenPulse AI Agent microservice...")


app = FastAPI(
    title="KitchenPulse AI Agent",
    description="Autonomous kitchen prep forecasting and inventory deficit evaluation microservice with PostgreSQL live state inspection.",
    version=__version__,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware (allowing Web Command Center & Backend connections)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health_router)
app.include_router(agent_router, prefix="/api/v1")
app.include_router(agent_router, prefix="/api")



@app.get("/")
async def root():
    return {
        "message": "KitchenPulse AI Agent API",
        "docs": "/docs",
        "health": "/health",
        "version": __version__,
        "database": "postgresql+asyncpg",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.environment == "development",
    )
