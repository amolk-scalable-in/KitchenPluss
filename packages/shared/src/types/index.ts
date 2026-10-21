// ============================================================
// @kitchenpulse/shared — Unified TypeScript Type Definitions
// Single Source of Truth for Web, Mobile, and Backend API
// ============================================================

export const TicketStatus = {
  QUEUE: 'QUEUE',
  FIRING: 'FIRING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

// Legacy alias for enum
export const TicketStatusEnum = TicketStatus;

export const OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const OrderStatusEnum = OrderStatus;

export const QualityFlag = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  PENDING_INSPECTION: 'PENDING_INSPECTION',
} as const;
export type QualityFlag = (typeof QualityFlag)[keyof typeof QualityFlag];

export const QualityFlagEnum = QualityFlag;


export type UserRole = 'Owner' | 'Admin' | 'Executive Chef' | 'Line Cook' | 'Staff' | 'Sous Chef';

// ── Multi-Tenant Organizations ─────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  created_at?: string | Date;
  updated_at?: string | Date;
}

// ── User & Auth ────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  auth_provider: 'email' | 'google';
  google_id?: string | null;
  role: UserRole | string;
  organization_id: string;
  organization_name?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export type SafeUser = Omit<User, 'google_id'>;

export interface AuthResponse {
  user: User;
  organization: Organization;
  token: string;
}

// ── Core Kitchen & Inventory ───────────────────────────────

export interface Ingredient {
  id: string;
  organization_id?: string;
  name: string;
  unit: string;
  current_stock: number;
  min_threshold: number;
  minimum_threshold?: number; // legacy alias
  cost_per_unit?: number;
  is_low_stock?: boolean;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface RecipeIngredient {
  recipe_id?: string;
  ingredient_id: string;
  ingredient_name?: string;
  unit?: string;
  quantity_required: number;
}

export interface Recipe {
  id: string;
  organization_id?: string;
  name?: string;
  menu_item_name?: string; // alias
  station: string;
  sale_price: number;
  price?: number; // alias
  prep_time_minutes?: number;
  ingredients?: RecipeIngredient[];
}

export interface LiveTicket {
  id: string;
  organization_id?: string;
  recipe_id: string;
  recipe_name?: string;
  station: string;
  status: TicketStatus;
  table_number?: number;
  notes?: string | null;
  created_at: string | Date;
  completed_at: string | Date | null;
  prep_time_minutes?: number;
  recipe_price?: number;
  ingredients?: RecipeIngredient[];
}

// Ticket alias for UI components
export type Ticket = LiveTicket;

export interface PrepLog {
  id: string;
  organization_id?: string;
  recipe_id: string;
  recipe_name?: string;
  prep_date: string;
  day_of_week: string;
  prepped_qty: number;
  portions_prepped?: number;
  waste_qty: number;
  notes: string | null;
  created_at?: string | Date;
}

export interface SupplierOrder {
  id: string;
  organization_id?: string;
  ingredient_id: string;
  ingredient_name?: string;
  unit?: string;
  quantity_ordered: number;
  status: OrderStatus;
  quality_flag: QualityFlag;
  created_at: string | Date;
}

export interface FoodCostSummary {
  recipe_id: string;
  organization_id?: string;
  recipe_name: string;
  sale_price?: number;
  menu_price?: number;
  total_prepped: number;
  total_waste?: number;
  total_wasted?: number;
  estimated_cost_per_serving?: number;
  total_recipe_cost?: number;
  total_waste_cost?: number;
  food_cost_pct?: number;
  waste_pct?: number;
  waste_rate_percent?: number;
  waste_cost_ratio_percent?: number;
}

export interface StationWorkload {
  station: string;
  queue_count: number;
  firing_count: number;
  total_active: number;
  workload_percentage: number;
}

// ── AI Optimization & Reasoning ────────────────────────────

export interface AiPrepItem {
  recipe_id: string;
  recipe_name: string;
  suggested_prep_qty: number;
  historical_waste_percent?: number;
  historical_avg_prepped: number;
  historical_avg_waste: number;
  waste_pct: number;
  confidence?: number;
  reasoning: string;
}

export interface AiPrepSheetResponse {
  day_of_week: string;
  generated_at: string;
  recommendations: AiPrepItem[];
  model_used?: string;
  summary_rationale?: string;
  ai_summary?: string;
  suggestions?: AiPrepItem[]; // mobile alias
}

// Mobile aliases
export type PrepSuggestion = AiPrepItem;
export type PrepOptimizationResult = AiPrepSheetResponse;

export interface WasteFormEntry {
  recipe_id: string;
  recipe_name: string;
  prepped_qty: number;
  waste_qty: number;
  notes: string;
}

// ── Socket Events ──────────────────────────────────────────

export interface ServerToClientEvents {
  'ticket:created': (ticket: LiveTicket) => void;
  'ticket:updated': (payload: Pick<LiveTicket, 'id' | 'status' | 'completed_at'>) => void;
  'stock:alert': (payload: {
    ingredient_id: string;
    ingredient_name: string;
    current_stock: number;
    min_threshold: number;
  }) => void;
  'station:workload': (workloads: StationWorkload[]) => void;
  'food_cost_updated': () => void;
  'ai:prep_sheet': (prepSheet: AiPrepSheetResponse) => void;
  'order:updated': (payload: Pick<SupplierOrder, 'id' | 'status' | 'quality_flag'>) => void;
}

export interface ClientToServerEvents {
  'join:org': (orgId: string) => void;
  'ticket:advance': (ticketId: string, nextStatus: TicketStatus) => void;
}

// ── API Request / Response Helpers ─────────────────────────

export type CreateIngredient = Omit<Ingredient, 'id' | 'updated_at'>;
export type UpdateIngredient = Partial<CreateIngredient>;

export type CreateRecipe = Omit<Recipe, 'id'>;
export type UpdateRecipe = Partial<CreateRecipe>;

export type CreatePrepLog = Omit<PrepLog, 'id' | 'created_at' | 'day_of_week'>;
export type CreateTicket = Pick<LiveTicket, 'recipe_id' | 'station'>;
export type CreateSupplierOrder = Pick<SupplierOrder, 'ingredient_id' | 'quantity_ordered'>;

export interface WsTicketCreated {
  event: 'ticket:created';
  payload: LiveTicket;
}

export interface WsTicketUpdated {
  event: 'ticket:updated';
  payload: Pick<LiveTicket, 'id' | 'status' | 'completed_at'>;
}

export interface WsStockAlert {
  event: 'stock:alert';
  payload: {
    ingredient_id: string;
    ingredient_name: string;
    current_stock: number;
    min_threshold: number;
  };
}

export interface WsOrderUpdate {
  event: 'order:updated';
  payload: Pick<SupplierOrder, 'id' | 'status' | 'quality_flag'>;
}

export type WsEvent =
  | WsTicketCreated
  | WsTicketUpdated
  | WsStockAlert
  | WsOrderUpdate;

// ── AI Recipe Generation & Dynamic BOM ─────────────────────

export interface AiRecipeGenerateInput {
  prompt: string;
  station?: string;
  target_cost?: number;
}

export interface AiRecipeGeneratedIngredient {
  name: string;
  unit: string;
  quantity_required: number;
  cost_per_unit: number;
  current_stock?: number;
  minimum_threshold?: number;
  matched_ingredient_id?: string;
  is_new?: boolean;
}

export interface AiRecipeGenerateResponse {
  dish_name: string;
  station: string;
  price: number;
  prep_time_minutes: number;
  description?: string;
  ingredients: AiRecipeGeneratedIngredient[];
  estimated_cost_per_portion: number;
  suggested_margin_pct: number;
  estimated_portion_cost?: number;
  gross_margin?: number;
  food_cost_percentage?: number;
  gross_margin_percentage?: number;
  new_ingredients_count?: number;
}

export interface CreateRecipeWithIngredientsInput {
  name: string;
  station: string;
  price: number;
  prep_time_minutes: number;
  description?: string;
  ingredients: {
    ingredient_id?: string;
    name: string;
    unit: string;
    quantity_required: number;
    cost_per_unit?: number;
    current_stock?: number;
    minimum_threshold?: number;
  }[];
}

// ── API Wrapper ────────────────────────────────────────────

export interface ApiResponse<T> {
  success?: boolean;
  data: T;
  error?: string;
  message?: string;
}

