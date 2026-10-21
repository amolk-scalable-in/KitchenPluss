import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    String,
    Numeric,
    Integer,
    DateTime,
    Date,
    Text,
    ForeignKey,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
)


class Base(DeclarativeBase):
    pass


class Organization(Base):
    """Multi-tenant organization (hotel, restaurant group) partition entity."""
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    ingredients: Mapped[List["Ingredient"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    recipes: Mapped[List["Recipe"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    prep_logs: Mapped[List["PrepLog"]] = relationship(back_populates="organization", cascade="all, delete-orphan")


class Ingredient(Base):
    """Pantry stock item with safety threshold and unit cost."""
    __tablename__ = "ingredients"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    current_stock: Mapped[Decimal] = mapped_column(Numeric(12, 4), default=Decimal("0.0"))
    minimum_threshold: Mapped[Decimal] = mapped_column(Numeric(12, 4), default=Decimal("0.0"))
    cost_per_unit: Mapped[Decimal] = mapped_column(Numeric(10, 4), default=Decimal("0.0"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationship
    organization: Mapped["Organization"] = relationship(back_populates="ingredients")

    __table_args__ = (
        Index("idx_ingredients_org_name", "organization_id", "name", unique=True),
    )


class Recipe(Base):
    """Menu item recipe with culinary station categorization and sale price."""
    __tablename__ = "recipes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    menu_item_name: Mapped[str] = mapped_column(String(255), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.0"))
    station: Mapped[str] = mapped_column(String(100), default="Main Kitchen", nullable=False)
    prep_time_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    organization: Mapped["Organization"] = relationship(back_populates="recipes")
    prep_logs: Mapped[List["PrepLog"]] = relationship(back_populates="recipe", cascade="all, delete-orphan")
    ingredients_bom: Mapped[List["RecipeIngredient"]] = relationship(back_populates="recipe", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_recipes_org_menu_name", "organization_id", "menu_item_name", unique=True),
        Index("idx_recipes_station", "station"),
    )


class RecipeIngredient(Base):
    """Bill of Materials (BOM) junction mapping required ingredients per dish portion."""
    __tablename__ = "recipe_ingredients"

    recipe_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("recipes.id", ondelete="CASCADE"), primary_key=True
    )
    ingredient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ingredients.id", ondelete="CASCADE"), primary_key=True
    )
    quantity_required: Mapped[Decimal] = mapped_column(Numeric(12, 4), default=Decimal("0.0"))

    # Relationships
    recipe: Mapped["Recipe"] = relationship(back_populates="ingredients_bom")
    ingredient: Mapped["Ingredient"] = relationship()


class PrepLog(Base):
    """Daily kitchen prep volume and scrap waste log."""
    __tablename__ = "prep_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recipe_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    prep_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    prepped_qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    waste_qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    day_of_week: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    organization: Mapped["Organization"] = relationship(back_populates="prep_logs")
    recipe: Mapped["Recipe"] = relationship(back_populates="prep_logs")

    __table_args__ = (
        Index("idx_prep_logs_org_date", "organization_id", "prep_date"),
    )


class LiveTicket(Base):
    """KDS live kitchen order ticket."""
    __tablename__ = "live_tickets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recipe_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False
    )
    station: Mapped[str] = mapped_column(String(100), default="Main Kitchen", nullable=False)
    table_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="QUEUE", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    recipe: Mapped["Recipe"] = relationship()

    __table_args__ = (
        Index("idx_live_tickets_org_status", "organization_id", "status"),
    )


class SupplierOrder(Base):
    """Supplier purchase order record."""
    __tablename__ = "supplier_orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ingredient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ingredients.id", ondelete="CASCADE"), nullable=False
    )
    quantity_ordered: Mapped[Decimal] = mapped_column(Numeric(12, 4), default=Decimal("0.0"))
    status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False)
    quality_flag: Mapped[str] = mapped_column(String(50), default="PENDING_INSPECTION", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    ingredient: Mapped["Ingredient"] = relationship()

    __table_args__ = (
        Index("idx_supplier_orders_org_status", "organization_id", "status"),
    )
