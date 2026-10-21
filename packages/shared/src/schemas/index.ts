// ============================================================
// @kitchenpulse/shared — Unified Zod Validation Schemas
// Enforces DRY contract validation between Web, Mobile, and API
// ============================================================

import { z } from 'zod';

// ── Auth Schemas ───────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().trim().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  email: z.string().trim().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').optional(),
  role: z.enum(['Owner', 'Admin', 'Executive Chef', 'Line Cook', 'Staff']).optional().default('Line Cook'),
  organization_id: z.string().uuid('Valid organization ID is required').optional(),
  organization_name: z.string().trim().min(2, 'Organization name must be at least 2 characters').optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const GoogleLoginSchema = z.object({
  credential: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  picture: z.string().url().optional(),
  googleId: z.string().optional(),
  organization_id: z.string().uuid().optional(),
  organization_name: z.string().optional(),
  role: z.string().optional(),
});

export type GoogleLoginInput = z.infer<typeof GoogleLoginSchema>;

// ── Ticket Schemas ─────────────────────────────────────────

export const TicketStatusSchema = z.enum(['QUEUE', 'FIRING', 'COMPLETED', 'CANCELLED']);

export const CreateTicketSchema = z.object({
  recipe_id: z.string().uuid('Valid recipe ID is required'),
  station: z.string().trim().min(1, 'Station is required').optional(),
  table_number: z.number().int().positive().optional().default(1),
  notes: z.string().trim().max(250).optional().nullable(),
});

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;

export const CreateBatchTicketsSchema = z.object({
  table_number: z.number().int().positive().default(1),
  items: z.array(
    z.object({
      recipe_id: z.string().uuid('Valid recipe ID is required'),
      station: z.string().trim().min(1).optional(),
      quantity: z.number().int().positive().default(1),
      notes: z.string().trim().max(250).optional().nullable(),
    })
  ).min(1, 'At least one dish must be selected'),
  common_notes: z.string().trim().max(250).optional().nullable(),
});

export type CreateBatchTicketsInput = z.infer<typeof CreateBatchTicketsSchema>;

export const UpdateTicketStatusSchema = z.object({
  status: TicketStatusSchema,
});

export type UpdateTicketStatusInput = z.infer<typeof UpdateTicketStatusSchema>;

// ── Inventory Schemas ──────────────────────────────────────

export const UpdateStockSchema = z.object({
  current_stock: z.number().min(0, 'Stock cannot be negative'),
});

export type UpdateStockInput = z.infer<typeof UpdateStockSchema>;

export const UpdateIngredientDetailsSchema = z.object({
  name: z.string().trim().min(1).optional(),
  unit: z.string().trim().min(1).optional(),
  min_threshold: z.number().min(0).optional(),
  minimum_threshold: z.number().min(0).optional(),
  cost_per_unit: z.number().min(0).optional(),
  current_stock: z.number().min(0).optional(),
});

export type UpdateIngredientDetailsInput = z.infer<typeof UpdateIngredientDetailsSchema>;

// ── Prep Log & Waste Schemas ───────────────────────────────

export const CreatePrepLogSchema = z.object({
  recipe_id: z.string().uuid('Valid recipe ID is required'),
  day_of_week: z.string().trim().min(1, 'Day of week is required'),
  prepped_qty: z.number().min(0, 'Prepped quantity cannot be negative'),
  waste_qty: z.number().min(0, 'Waste quantity cannot be negative'),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type CreatePrepLogInput = z.infer<typeof CreatePrepLogSchema>;

// ── Supplier Order Schemas ─────────────────────────────────

export const OrderStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']);
export const QualityFlagSchema = z.enum(['PASS', 'FAIL', 'PENDING_INSPECTION']);

export const CreateSupplierOrderSchema = z.object({
  ingredient_id: z.string().uuid('Valid ingredient ID is required'),
  quantity_ordered: z.number().positive('Quantity ordered must be greater than zero'),
});

export type CreateSupplierOrderInput = z.infer<typeof CreateSupplierOrderSchema>;

export const UpdateSupplierOrderStatusSchema = z.object({
  status: OrderStatusSchema,
  quality_flag: QualityFlagSchema.optional(),
});

export type UpdateSupplierOrderStatusInput = z.infer<typeof UpdateSupplierOrderStatusSchema>;

// ── User Management Schemas ────────────────────────────────

export const CreateUserSchema = z.object({
  email: z.string().trim().email('Invalid email address format'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['Owner', 'Admin', 'Executive Chef', 'Line Cook', 'Staff', 'Sous Chef']),
  password: z.string().min(6).optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserRoleSchema = z.object({
  role: z.enum(['Owner', 'Admin', 'Executive Chef', 'Line Cook', 'Staff', 'Sous Chef']),
});

export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>;

// ── Recipe & AI Schemas ────────────────────────────────────

export const AiRecipeGenerateSchema = z.object({
  prompt: z.string().trim().min(2, 'Dish prompt must be at least 2 characters'),
  station: z.string().trim().optional(),
  target_cost: z.number().positive().optional(),
});

export const CreateRecipeWithIngredientsSchema = z.object({
  name: z.string().trim().min(1, 'Dish name is required').max(255),
  station: z.string().trim().min(1, 'Station is required').max(100).default('Sauté'),
  price: z.number().positive('Price must be greater than zero'),
  prep_time_minutes: z.number().int().positive().default(15),
  description: z.string().trim().optional(),
  ingredients: z.array(z.object({
    ingredient_id: z.string().uuid().optional(),
    name: z.string().trim().min(1, 'Ingredient name is required'),
    unit: z.string().trim().min(1, 'Unit is required').max(50),
    quantity_required: z.number().positive('Quantity required must be positive'),
    cost_per_unit: z.number().nonnegative().optional().default(0),
    current_stock: z.number().nonnegative().optional().default(10),
    minimum_threshold: z.number().nonnegative().optional().default(3),
  })).min(1, 'At least one ingredient is required in the Bill of Materials'),
});
