-- ============================================================
-- KitchenPulse — Initial Schema
-- ============================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector extension for in-database vector embeddings & semantic search
DO $$ BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pgvector extension not installed: %', SQLERRM;
END $$;

-- ── Ingredients ────────────────────────────────────────────
-- id, name, unit, current_stock, minimum_threshold
CREATE TABLE IF NOT EXISTS ingredients (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL UNIQUE,
    unit                VARCHAR(50)  NOT NULL,          -- e.g. 'kg', 'L', 'each'
    current_stock       NUMERIC(12, 4) NOT NULL DEFAULT 0,
    minimum_threshold   NUMERIC(12, 4) NOT NULL DEFAULT 0,
    min_threshold       NUMERIC(12, 4) GENERATED ALWAYS AS (minimum_threshold) STORED,
    cost_per_unit       NUMERIC(10, 4) NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients (name);

-- ── Recipes ────────────────────────────────────────────────
-- id, menu_item_name, price
CREATE TABLE IF NOT EXISTS recipes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_name      VARCHAR(255) NOT NULL UNIQUE,
    name                VARCHAR(255) GENERATED ALWAYS AS (menu_item_name) STORED,
    price               NUMERIC(10, 2) NOT NULL DEFAULT 0,
    sale_price          NUMERIC(10, 2) GENERATED ALWAYS AS (price) STORED,
    station             VARCHAR(100)  NOT NULL DEFAULT 'Main Kitchen', -- e.g. 'Grill', 'Sauté', 'Oven'
    prep_time_minutes   INTEGER       NOT NULL DEFAULT 15,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_station ON recipes (station);
CREATE INDEX IF NOT EXISTS idx_recipes_menu_name ON recipes (menu_item_name);

-- ── Recipe ↔ Ingredients (junction) ────────────────────────
-- recipe_id, ingredient_id, quantity_required
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    recipe_id           UUID NOT NULL REFERENCES recipes(id)      ON DELETE CASCADE,
    ingredient_id       UUID NOT NULL REFERENCES ingredients(id)  ON DELETE CASCADE,
    quantity_required   NUMERIC(12, 4) NOT NULL DEFAULT 0,
    quantity_used       NUMERIC(12, 4) GENERATED ALWAYS AS (quantity_required) STORED,
    PRIMARY KEY (recipe_id, ingredient_id)
);

-- ── Prep Logs ──────────────────────────────────────────────
-- id, recipe_id, prep_date, prepped_qty, waste_qty, day_of_week
CREATE TABLE IF NOT EXISTS prep_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id           UUID         NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    prep_date           DATE         NOT NULL DEFAULT CURRENT_DATE,
    prepped_qty         INTEGER      NOT NULL DEFAULT 0,
    portions_prepped    INTEGER      GENERATED ALWAYS AS (prepped_qty) STORED,
    waste_qty           INTEGER      NOT NULL DEFAULT 0,
    day_of_week         VARCHAR(20)  NOT NULL DEFAULT TO_CHAR(CURRENT_DATE, 'Day'),
    notes               TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    logged_at           TIMESTAMPTZ  GENERATED ALWAYS AS (created_at) STORED
);

CREATE INDEX IF NOT EXISTS idx_prep_logs_recipe   ON prep_logs (recipe_id);
CREATE INDEX IF NOT EXISTS idx_prep_logs_date     ON prep_logs (prep_date);
CREATE INDEX IF NOT EXISTS idx_prep_logs_day      ON prep_logs (day_of_week);

-- ── Live Tickets ───────────────────────────────────────────
-- id, recipe_id, status, created_at, completed_at
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
        CREATE TYPE ticket_status AS ENUM ('QUEUE', 'FIRING', 'COMPLETED');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS live_tickets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id       UUID          NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    station         VARCHAR(100)  NOT NULL DEFAULT 'Main Kitchen',
    table_number    INTEGER       NOT NULL DEFAULT 1,
    status          ticket_status NOT NULL DEFAULT 'QUEUE',
    notes           TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_live_tickets_status  ON live_tickets (status);
CREATE INDEX IF NOT EXISTS idx_live_tickets_station ON live_tickets (station);

-- ── Supplier Orders ────────────────────────────────────────
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status  AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quality_flag') THEN
        CREATE TYPE quality_flag  AS ENUM ('PASS', 'FAIL', 'PENDING_INSPECTION');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS supplier_orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_id       UUID           NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity_ordered    NUMERIC(12, 4) NOT NULL DEFAULT 0,
    status              order_status   NOT NULL DEFAULT 'PENDING',
    quality_flag        quality_flag   NOT NULL DEFAULT 'PENDING_INSPECTION',
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    ordered_at          TIMESTAMPTZ    GENERATED ALWAYS AS (created_at) STORED
);

CREATE INDEX IF NOT EXISTS idx_supplier_orders_ingredient ON supplier_orders (ingredient_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_status     ON supplier_orders (status);

-- ── Materialized View: Food Cost Summary ───────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_food_cost_summary;

CREATE MATERIALIZED VIEW mv_food_cost_summary AS
SELECT
    r.id                                          AS recipe_id,
    r.menu_item_name                              AS menu_item_name,
    r.name                                        AS recipe_name,
    r.price                                       AS price,
    r.sale_price                                  AS sale_price,
    COALESCE(SUM(pl.prepped_qty), 0)              AS total_prepped,
    COALESCE(SUM(pl.waste_qty), 0)                AS total_waste,
    -- Estimated ingredient cost per serving
    COALESCE(
        (SELECT SUM(ri.quantity_required * i.cost_per_unit)
         FROM   recipe_ingredients ri
         JOIN   ingredients i ON i.id = ri.ingredient_id
         WHERE  ri.recipe_id = r.id),
        0
    )                                             AS estimated_cost_per_serving,
    -- Total cost of ingredients prepped
    COALESCE(
        (SELECT SUM(ri.quantity_required * i.cost_per_unit)
         FROM   recipe_ingredients ri
         JOIN   ingredients i ON i.id = ri.ingredient_id
         WHERE  ri.recipe_id = r.id),
        0
    ) * COALESCE(SUM(pl.prepped_qty), 0)          AS total_cost,
    -- Food cost percentage (cost / sale_price × 100)
    CASE
        WHEN r.price > 0 THEN
            ROUND(
                COALESCE(
                    (SELECT SUM(ri.quantity_required * i.cost_per_unit)
                     FROM   recipe_ingredients ri
                     JOIN   ingredients i ON i.id = ri.ingredient_id
                     WHERE  ri.recipe_id = r.id),
                    0
                ) / r.price * 100,
                2
            )
        ELSE 0
    END                                           AS food_cost_pct,
    -- Waste percentage
    CASE
        WHEN COALESCE(SUM(pl.prepped_qty), 0) > 0 THEN
            ROUND(
                COALESCE(SUM(pl.waste_qty), 0)::NUMERIC
                / COALESCE(SUM(pl.prepped_qty), 0) * 100,
                2
            )
        ELSE 0
    END                                           AS waste_pct
FROM   recipes r
LEFT JOIN prep_logs pl ON pl.recipe_id = r.id
GROUP BY r.id, r.menu_item_name, r.name, r.price, r.sale_price;

CREATE UNIQUE INDEX idx_mv_food_cost_recipe ON mv_food_cost_summary (recipe_id);
