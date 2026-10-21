from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from ..schemas.agent import (
    ForecastRequest,
    ForecastResponse,
    InventoryEvalRequest,
    InventoryEvalResponse,
    LiveInventoryStatusResponse,
    LiveRecipeListResponse,
)
from ..services.agent_service import AgentService
from ..db.session import get_db_session

router = APIRouter(prefix="/agent", tags=["AI Agent"])


@router.post(
    "/forecast",
    response_model=ForecastResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate AI Prep Recommendations",
)
async def generate_forecast(
    payload: ForecastRequest,
    session: AsyncSession = Depends(get_db_session),
):
    """
    Generate target day kitchen prep sheet recommendations grounded in real PostgreSQL
    historical waste logs, active recipes, and portioning models.
    """
    try:
        return await AgentService.generate_prep_forecast(payload, session)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate prep forecast: {str(exc)}",
        ) from exc


@router.post(
    "/inventory-eval",
    response_model=InventoryEvalResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate Inventory Deficits",
)
async def evaluate_inventory(
    payload: InventoryEvalRequest,
    session: AsyncSession = Depends(get_db_session),
):
    """
    Evaluate stock shortfalls against minimum thresholds directly from PostgreSQL
    and recommend supplier purchase orders using Gemini structured outputs.
    """
    try:
        return await AgentService.evaluate_inventory(payload, session)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to evaluate inventory: {str(exc)}",
        ) from exc


@router.get(
    "/live-inventory/{organization_id}",
    response_model=LiveInventoryStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Live PostgreSQL Pantry Inspection",
)
async def get_live_inventory(
    organization_id: str,
    session: AsyncSession = Depends(get_db_session),
):
    """
    Directly query live pantry stock, safety thresholds, and calculated deficits from PostgreSQL.
    Strictly isolated to caller's organization_id.
    """
    try:
        return await AgentService.get_live_inventory_status(organization_id, session)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query live inventory: {str(exc)}",
        ) from exc


@router.get(
    "/live-recipes/{organization_id}",
    response_model=LiveRecipeListResponse,
    status_code=status.HTTP_200_OK,
    summary="Live PostgreSQL Recipe & Station Inspection",
)
async def get_live_recipes(
    organization_id: str,
    session: AsyncSession = Depends(get_db_session),
):
    """
    Directly query active menu items, prep stations, and BOM linkages from PostgreSQL.
    Strictly isolated to caller's organization_id.
    """
    try:
        return await AgentService.get_live_recipes(organization_id, session)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query live recipes: {str(exc)}",
        ) from exc
