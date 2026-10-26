import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initDb(): Promise<void> {
  try {
    // 1. Ensure users table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
          id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email          VARCHAR(255) NOT NULL UNIQUE,
          password_hash  VARCHAR(255),
          name           VARCHAR(255) NOT NULL DEFAULT '',
          avatar_url     TEXT,
          auth_provider  VARCHAR(50) NOT NULL DEFAULT 'email',
          google_id      VARCHAR(255) UNIQUE,
          role           VARCHAR(50) NOT NULL DEFAULT 'Executive Chef',
          created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);
    `);

    // 2. Run Migration 03 (Organizations & Multi-Tenancy)
    const migrationPath = path.resolve(__dirname, 'migrations', '03_organizations.sql');
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      await pool.query(sql);
      console.log('✅ Database schema verified: multi-tenant organizations & foreign keys ready');
    } else {
      console.warn('⚠️ Migration 03_organizations.sql not found at:', migrationPath);
    }

    // 3. Run Migration 04 (pgvector & Recipe SOP Embeddings)
    const vectorMigrationPath = path.resolve(__dirname, 'migrations', '04_pgvector.sql');
    if (fs.existsSync(vectorMigrationPath)) {
      const vectorSql = fs.readFileSync(vectorMigrationPath, 'utf8');
      await pool.query(vectorSql);
      console.log('✅ Database schema verified: pgvector & recipe_embeddings table ready');
    } else {
      console.warn('⚠️ Migration 04_pgvector.sql not found at:', vectorMigrationPath);
    }
  } catch (error) {
    console.error('❌ Error initializing database schema:', error);
  }
}
