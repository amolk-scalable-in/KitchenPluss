from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class ForecastRequest(BaseModel):
    """Input payload for prep forecasting."""
    organization_id: str = Field(..., description="UUID of the organization / hotel client")
    target_date: Optional[str] = Field(None, description="ISO date (YYYY-MM-DD), defaults to tomorrow")
    day_of_week: Optional[str] = Field(None, description="Day of week override, e.g. 'Monday'")
    use_live_db: bool = Field(default=True, description="Query PostgreSQL database for real historical logs and recipes")


class ForecastItem(BaseModel):
    """Individual menu item prep recommendation."""
    recipe_id: str
    menu_item_name: str
    station: str
    recommended_portions: int
    historical_avg_waste: float
    confidence_score: float = Field(ge=0.0, le=1.0)
    reasoning: str


class GeminiForecastOutput(BaseModel):
    """Structured JSON schema enforced during Gemini model output generation."""
    items: List[ForecastItem] = Field(description="List of recipe prep portion recommendations")
    overall_summary: str = Field(description="High-level kitchen prep optimization strategy and summary")


class ForecastResponse(BaseModel):
    """Response containing AI prep sheet suggestions."""
    organization_id: str
    target_day: str
    generated_at: datetime
    items: List[ForecastItem]
    overall_summary: str
    ai_model: str = Field(default="gemini-3.8-flash", description="Gemini model employed")
    structured_output_enforced: bool = Field(default=True, description="Enforced JSON Schema conformity")
    data_source: str = Field(default="live_database", description="'live_database' or 'deterministic_fallback'")


class InventoryEvalRequest(BaseModel):
    """Input payload for inventory shortfall evaluation."""
    organization_id: str = Field(..., description="UUID of the organization / hotel client")
    ingredient_ids: Optional[List[str]] = Field(None, description="Optional subset of ingredient UUIDs to audit")
    use_live_db: bool = Field(default=True, description="Query PostgreSQL database for real stock levels")


class RecommendedAction(BaseModel):
    """Recommended purchase or stock action."""
    ingredient_id: str
    ingredient_name: str
    current_stock: float
    safety_threshold: float
    deficit: float
    suggested_order_qty: float
    urgency: str = Field(description="NORMAL, URGENT, or CRITICAL")


class GeminiInventoryOutput(BaseModel):
    """Structured JSON schema enforced during Gemini inventory evaluation."""
    critical_count: int = Field(description="Total count of critical/urgent items requiring immediate purchase order")
    recommended_orders: List[RecommendedAction] = Field(description="List of calculated supplier orders")


class InventoryEvalResponse(BaseModel):
    """Evaluation result for pantry stock."""
    organization_id: str
    evaluated_at: datetime
    critical_count: int
    recommended_orders: List[RecommendedAction]
    ai_model: str = Field(default="gemini-3.8-flash", description="Gemini model employed")
    structured_output_enforced: bool = Field(default=True, description="Enforced JSON Schema conformity")
    data_source: str = Field(default="live_database", description="'live_database' or 'deterministic_fallback'")
    total_ingredients_audited: int = Field(default=0, description="Total pantry items checked")


# ── Live Database Inspection Schemas ──────────────────────────

class LiveIngredientItem(BaseModel):
    """Live ingredient record from PostgreSQL."""
    id: str
    name: str
    unit: str
    current_stock: float
    minimum_threshold: float
    cost_per_unit: float
    is_low_stock: bool
    deficit: float


class LiveInventoryStatusResponse(BaseModel):
    """Real-time pantry inventory state directly from PostgreSQL."""
    organization_id: str
    organization_name: Optional[str] = None
    timestamp: datetime
    total_items: int
    low_stock_count: int
    estimated_valuation: float
    items: List[LiveIngredientItem]


class LiveRecipeItem(BaseModel):
    """Live recipe item from PostgreSQL."""
    id: str
    menu_item_name: str
    station: str
    price: float
    prep_time_minutes: int
    bom_count: int = 0


class LiveRecipeListResponse(BaseModel):
    """Real-time recipe list directly from PostgreSQL."""
    organization_id: str
    total_recipes: int
    recipes: List[LiveRecipeItem]


# ── Server-Sent Events (SSE) Streaming Schemas ─────────────────

class StreamRequest(BaseModel):
    """Input payload for real-time SSE recommendation streaming."""
    organization_id: str = Field(..., description="UUID of the organization / hotel client")
    prompt: Optional[str] = Field(None, description="Custom chef query or instructions")
    stream_type: str = Field(
        default="prep_forecast",
        description="Stream mode: 'prep_forecast', 'inventory_eval', or 'chef_assistant'"
    )
    day_of_week: Optional[str] = Field(None, description="Day of week override, e.g. 'Friday'")
    use_live_db: bool = Field(default=True, description="Query PostgreSQL database for real inventory/recipes")

