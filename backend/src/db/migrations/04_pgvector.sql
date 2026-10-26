-- ============================================================
-- KitchenPulse — Recipe & SOP Vector Database Schema
-- Migration 04: pgvector extension & recipe_embeddings table
-- ============================================================

-- 1. Enable pgvector extension
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pgvector C extension not available in environment: %', SQLERRM;
END $$;

-- 2. Create custom Cosine Similarity and Cosine Distance fallback functions
-- This guarantees semantic similarity vector operations work seamlessly
-- across all environments (pgvector extension or fallback float8[] / double precision arrays)
CREATE OR REPLACE FUNCTION cosine_similarity(a FLOAT8[], b FLOAT8[])
RETURNS FLOAT8 AS $$
DECLARE
    dot_product FLOAT8 := 0.0;
    norm_a FLOAT8 := 0.0;
    norm_b FLOAT8 := 0.0;
    dim INT;
    i INT;
BEGIN
    dim := array_length(a, 1);
    IF dim IS NULL OR dim != array_length(b, 1) THEN
        RETURN 0.0;
    END IF;

    FOR i IN 1..dim LOOP
        dot_product := dot_product + (a[i] * b[i]);
        norm_a := norm_a + (a[i] * a[i]);
        norm_b := norm_b + (b[i] * b[i]);
    END LOOP;

    IF norm_a = 0.0 OR norm_b = 0.0 THEN
        RETURN 0.0;
    END IF;

    RETURN dot_product / (sqrt(norm_a) * sqrt(norm_b));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION cosine_distance(a FLOAT8[], b FLOAT8[])
RETURNS FLOAT8 AS $$
BEGIN
    RETURN 1.0 - cosine_similarity(a, b);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Create recipe_embeddings table
-- Holds chunked standard operating procedures (SOPs), recipe steps,
-- allergen notices, and prep guides with 768-dimensional embeddings (matching Gemini text-embedding-004)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
        -- Native pgvector extension available
        CREATE TABLE IF NOT EXISTS recipe_embeddings (
            id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            recipe_id           UUID REFERENCES recipes(id) ON DELETE CASCADE,
            document_type       VARCHAR(50) NOT NULL, -- 'recipe_procedure', 'allergen_warning', 'prep_sop', 'food_safety'
            title               VARCHAR(255) NOT NULL,
            content             TEXT NOT NULL,
            metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
            embedding           vector(768),
            created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Create HNSW index for ultra-fast vector search
        CREATE INDEX IF NOT EXISTS idx_recipe_embeddings_hnsw 
        ON recipe_embeddings USING hnsw (embedding vector_cosine_ops);
    ELSE
        -- Resilient float8[] array fallback for local dev environments lacking native C extension
        CREATE TABLE IF NOT EXISTS recipe_embeddings (
            id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            recipe_id           UUID REFERENCES recipes(id) ON DELETE CASCADE,
            document_type       VARCHAR(50) NOT NULL,
            title               VARCHAR(255) NOT NULL,
            content             TEXT NOT NULL,
            metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
            embedding           FLOAT8[],
            created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    END IF;
END $$;

-- 4. Multi-Tenant Indexes
CREATE INDEX IF NOT EXISTS idx_recipe_embeddings_org ON recipe_embeddings (organization_id);
CREATE INDEX IF NOT EXISTS idx_recipe_embeddings_recipe ON recipe_embeddings (recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_embeddings_type ON recipe_embeddings (document_type);
CREATE INDEX IF NOT EXISTS idx_recipe_embeddings_metadata ON recipe_embeddings USING gin (metadata);
