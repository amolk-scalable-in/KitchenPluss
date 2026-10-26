from datetime import datetime, timezone
from typing import Optional, AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from ..schemas.agent import (
    ForecastRequest,
    ForecastResponse,
    InventoryEvalRequest,
    InventoryEvalResponse,
    LiveInventoryStatusResponse,
    LiveIngredientItem,
    LiveRecipeListResponse,
    LiveRecipeItem,
    StreamRequest,
)
from ..db.session import get_session_factory
from ..db.repository import KitchenDbRepository
from .gemini_service import GeminiService


class AgentService:
    """Core domain logic for KitchenPulse AI forecasting and live PostgreSQL inventory evaluation."""

    @staticmethod
    async def generate_prep_forecast(
        payload: ForecastRequest,
        session: Optional[AsyncSession] = None,
    ) -> ForecastResponse:
        """
        Generate prep sheet forecasting grounded in PostgreSQL database state and historical logs
        using Google Gemini 3.8 Flash SDK integration with structured outputs.
        """
        return await GeminiService.generate_prep_forecast(payload, session)

    @staticmethod
    async def evaluate_inventory(
        payload: InventoryEvalRequest,
        session: Optional[AsyncSession] = None,
    ) -> InventoryEvalResponse:
        """
        Evaluate stock shortfalls against safety thresholds from live PostgreSQL database tables
        using Google Gemini 3.8 Flash SDK integration with structured outputs.
        """
        return await GeminiService.evaluate_inventory(payload, session)

    @staticmethod
    async def stream_recommendations(
        payload: StreamRequest,
        session: Optional[AsyncSession] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Stream real-time SSE recommendation events from Gemini AI grounded in PostgreSQL state.
        """
        async for chunk in GeminiService.stream_recommendations(payload, session):
            yield chunk

    @staticmethod
    async def get_live_inventory_status(
        organization_id: str,
        session: Optional[AsyncSession] = None,
    ) -> LiveInventoryStatusResponse:
        """
        Query live ingredients and deficits directly from PostgreSQL with tenant isolation.
        """
        async def _query(s: AsyncSession) -> LiveInventoryStatusResponse:
            org = await KitchenDbRepository.get_organization(s, organization_id)
            org_name = org.name if org else None

            ingredients = await KitchenDbRepository.get_inventory_by_org(s, organization_id)
            items = []
            low_stock_count = 0
            total_valuation = 0.0

            for item in ingredients:
                current = float(item.current_stock)
                safe = float(item.minimum_threshold)
                cost = float(item.cost_per_unit)
                is_low = current < safe
                deficit = round(safe - current, 4) if is_low else 0.0

                if is_low:
                    low_stock_count += 1
                total_valuation += (current * cost)

                items.append(
                    LiveIngredientItem(
                        id=str(item.id),
                        name=item.name,
                        unit=item.unit,
                        current_stock=current,
                        minimum_threshold=safe,
                        cost_per_unit=cost,
                        is_low_stock=is_low,
                        deficit=deficit,
                    )
                )

            return LiveInventoryStatusResponse(
                organization_id=organization_id,
                organization_name=org_name,
                timestamp=datetime.now(timezone.utc),
                total_items=len(items),
                low_stock_count=low_stock_count,
                estimated_valuation=round(total_valuation, 2),
                items=items,
            )

        if session is not None and isinstance(session, AsyncSession):
            return await _query(session)
        else:
            factory = get_session_factory()
            async with factory() as auto_session:
                return await _query(auto_session)

    @staticmethod
    async def get_live_recipes(
        organization_id: str,
        session: Optional[AsyncSession] = None,
    ) -> LiveRecipeListResponse:
        """
        Query active recipes and station assignments directly from PostgreSQL with tenant isolation.
        """
        async def _query(s: AsyncSession) -> LiveRecipeListResponse:
            recipes = await KitchenDbRepository.get_recipes_by_org(s, organization_id, load_bom=True)
            items = [
                LiveRecipeItem(
                    id=str(r.id),
                    menu_item_name=r.menu_item_name,
                    station=r.station,
                    price=float(r.price),
                    prep_time_minutes=r.prep_time_minutes,
                    bom_count=len(r.ingredients_bom),
                )
                for r in recipes
            ]
            return LiveRecipeListResponse(
                organization_id=organization_id,
                total_recipes=len(items),
                recipes=items,
            )

        if session is not None and isinstance(session, AsyncSession):
            return await _query(session)
        else:
            factory = get_session_factory()
            async with factory() as auto_session:
                return await _query(auto_session)
