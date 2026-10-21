import logging
import uuid
from typing import List, Optional, Dict, Any
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from .models import (
    Organization,
    Ingredient,
    Recipe,
    RecipeIngredient,
    PrepLog,
    LiveTicket,
    SupplierOrder,
)

logger = logging.getLogger("kitchenpulse.db.repository")


def _to_uuid(val: str | uuid.UUID) -> uuid.UUID:
    """Normalize input to UUID instance."""
    if isinstance(val, uuid.UUID):
        return val
    return uuid.UUID(str(val))


class KitchenDbRepository:
    """
    Tenant-Isolated Database Repository.
    CRITICAL ARCHITECTURE DIRECTIVE: Every single query MUST filter by organization_id!
    """

    @staticmethod
    async def get_organization(session: AsyncSession, organization_id: str | uuid.UUID) -> Optional[Organization]:
        """Fetch organization profile by ID."""
        org_uuid = _to_uuid(organization_id)
        stmt = select(Organization).where(Organization.id == org_uuid)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_all_organizations(session: AsyncSession) -> List[Organization]:
        """List all active organizations in the database."""
        stmt = select(Organization).order_by(Organization.name)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_inventory_by_org(
        session: AsyncSession,
        organization_id: str | uuid.UUID,
        ingredient_ids: Optional[List[str]] = None,
    ) -> List[Ingredient]:
        """
        Fetch all ingredients scoped strictly to organization_id.
        Optional ingredient_ids filter for targeted audits.
        """
        org_uuid = _to_uuid(organization_id)
        conditions = [Ingredient.organization_id == org_uuid]

        if ingredient_ids:
            uuid_list = [_to_uuid(i) for i in ingredient_ids]
            conditions.append(Ingredient.id.in_(uuid_list))

        stmt = select(Ingredient).where(and_(*conditions)).order_by(Ingredient.name)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_low_stock_by_org(
        session: AsyncSession,
        organization_id: str | uuid.UUID,
    ) -> List[Ingredient]:
        """
        Fetch ingredients where current_stock is strictly below minimum_threshold.
        Strictly scoped to organization_id.
        """
        org_uuid = _to_uuid(organization_id)
        stmt = (
            select(Ingredient)
            .where(
                and_(
                    Ingredient.organization_id == org_uuid,
                    Ingredient.current_stock < Ingredient.minimum_threshold,
                )
            )
            .order_by(Ingredient.name)
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_recipes_by_org(
        session: AsyncSession,
        organization_id: str | uuid.UUID,
        load_bom: bool = False,
    ) -> List[Recipe]:
        """
        Fetch recipes scoped strictly to organization_id.
        Optionally eager-loads the Bill of Materials (BOM) ingredients.
        """
        org_uuid = _to_uuid(organization_id)
        stmt = select(Recipe).where(Recipe.organization_id == org_uuid).order_by(Recipe.station, Recipe.menu_item_name)
        if load_bom:
            stmt = stmt.options(
                selectinload(Recipe.ingredients_bom).selectinload(RecipeIngredient.ingredient)
            )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_prep_history_by_org(
        session: AsyncSession,
        organization_id: str | uuid.UUID,
        day_of_week: Optional[str] = None,
        limit: int = 50,
    ) -> List[PrepLog]:
        """
        Fetch historical prep logs with associated recipe details, scoped to organization_id.
        Optionally filters by day of the week (e.g. 'Friday').
        """
        org_uuid = _to_uuid(organization_id)
        conditions = [PrepLog.organization_id == org_uuid]

        if day_of_week:
            # Case-insensitive day match (strips trailing whitespace)
            conditions.append(func.trim(func.lower(PrepLog.day_of_week)) == day_of_week.strip().lower())

        stmt = (
            select(PrepLog)
            .options(selectinload(PrepLog.recipe))
            .where(and_(*conditions))
            .order_by(PrepLog.prep_date.desc())
            .limit(limit)
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_inventory_audit_summary(
        session: AsyncSession,
        organization_id: str | uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Compute real-time inventory statistics and deficits from PostgreSQL.
        """
        ingredients = await KitchenDbRepository.get_inventory_by_org(session, organization_id)
        total_count = len(ingredients)
        low_stock_items = []
        total_valuation = Decimal("0.0")

        for item in ingredients:
            current = float(item.current_stock)
            safe = float(item.minimum_threshold)
            cost = float(item.cost_per_unit)
            total_valuation += Decimal(str(current * cost))

            if current < safe:
                deficit = round(safe - current, 2)
                # Recommended reorder: deficit plus buffer (or 2x deficit)
                suggested_qty = round(max(deficit * 2.0, safe), 2)
                urgency = "CRITICAL" if current <= (safe * 0.5) else "URGENT"
                low_stock_items.append({
                    "ingredient_id": str(item.id),
                    "ingredient_name": item.name,
                    "unit": item.unit,
                    "current_stock": current,
                    "safety_threshold": safe,
                    "deficit": deficit,
                    "suggested_order_qty": suggested_qty,
                    "urgency": urgency,
                })

        return {
            "organization_id": str(_to_uuid(organization_id)),
            "total_items": total_count,
            "critical_count": len(low_stock_items),
            "estimated_valuation": float(round(total_valuation, 2)),
            "deficits": low_stock_items,
        }
