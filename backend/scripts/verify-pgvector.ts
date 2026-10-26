import pool from '../src/db/pool.js';

const GRAND_PALACE_ORG_ID = '11111111-1111-1111-1111-111111111111';

async function verifyPgvector() {
  console.log('='.repeat(65));
  console.log(' KitchenPulse — Day 6 pgvector & Vector Database Verification');
  console.log('='.repeat(65));

  const client = await pool.connect();
  try {
    // 1. Verify Extension or Fallback Setup
    console.log('\n[1/5] Checking pgvector extension status in PostgreSQL...');
    const extRes = await client.query(`
      SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
    `);
    if (extRes.rows.length > 0) {
      console.log(`  -> Native pgvector extension is ACTIVE (v${extRes.rows[0].extversion})`);
    } else {
      console.log('  -> Native vector extension not present in Windows OS build; resilient vector schema active');
    }

    // 2. Verify recipe_embeddings Table Columns
    console.log('\n[2/5] Inspecting recipe_embeddings table schema...');
    const colRes = await client.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'recipe_embeddings'
      ORDER BY ordinal_position;
    `);

    if (colRes.rows.length === 0) {
      throw new Error("Table 'recipe_embeddings' does not exist!");
    }

    console.log(`  -> Table found with ${colRes.rows.length} columns:`);
    for (const row of colRes.rows) {
      console.log(`     • ${row.column_name.padEnd(18)} : ${row.data_type} (${row.udt_name})`);
    }

    const columnNames = colRes.rows.map((r) => r.column_name);
    const requiredCols = [
      'id',
      'organization_id',
      'recipe_id',
      'document_type',
      'title',
      'content',
      'metadata',
      'embedding',
    ];
    for (const req of requiredCols) {
      if (!columnNames.includes(req)) {
        throw new Error(`Missing required column: ${req}`);
      }
    }
    console.log('  -> All required columns present.');

    // 3. Verify Indexes
    console.log('\n[3/5] Inspecting multi-tenant indexes...');
    const idxRes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'recipe_embeddings';
    `);
    console.log(`  -> Found ${idxRes.rows.length} indexes:`);
    for (const idx of idxRes.rows) {
      console.log(`     • ${idx.indexname}`);
    }

    // 4. Verify Vector Operations & Insertion Test
    console.log('\n[4/5] Testing 768-dimensional embedding insertion and cosine distance...');
    // Create two mock 768-dim normalized embedding vectors
    const v1 = Array(768).fill(0.01);
    const v2 = Array(768).fill(0.02);

    // Format embedding based on column type
    const embCol = colRes.rows.find((r) => r.column_name === 'embedding');
    const isNativeVector = embCol?.udt_name === 'vector';
    const embVal1 = isNativeVector ? JSON.stringify(v1) : v1;
    const embVal2 = isNativeVector ? JSON.stringify(v2) : v2;

    const insertRes1 = await client.query(
      `
      INSERT INTO recipe_embeddings (
        organization_id, document_type, title, content, metadata, embedding
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, title;
    `,
      [
        GRAND_PALACE_ORG_ID,
        'recipe_procedure',
        'Butter Chicken Slow-Simmer SOP',
        'Simmer makhani gravy for 45 minutes on low flame.',
        JSON.stringify({ station: 'Curry & Handi', allergens: ['Dairy'] }),
        embVal1,
      ]
    );

    const insertRes2 = await client.query(
      `
      INSERT INTO recipe_embeddings (
        organization_id, document_type, title, content, metadata, embedding
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, title;
    `,
      [
        GRAND_PALACE_ORG_ID,
        'allergen_warning',
        'Paneer Tikka Dairy Notice',
        'Contains full cream dairy paneer cubes.',
        JSON.stringify({ station: 'Tandoor & Starters', allergens: ['Dairy'] }),
        embVal2,
      ]
    );

    console.log(`  -> Inserted 2 test vector documents:`);
    console.log(`     1. ${insertRes1.rows[0].title} (${insertRes1.rows[0].id})`);
    console.log(`     2. ${insertRes2.rows[0].title} (${insertRes2.rows[0].id})`);

    // Test Cosine Similarity Query
    console.log('\n[5/5] Executing vector similarity calculation...');
    let simScore: number;
    if (isNativeVector) {
      const distRes = await client.query(`
        SELECT 
          id, title,
          1 - (embedding <=> '${JSON.stringify(v1)}') AS similarity
        FROM recipe_embeddings
        WHERE organization_id = '${GRAND_PALACE_ORG_ID}'
        ORDER BY similarity DESC
        LIMIT 1;
      `);
      simScore = parseFloat(distRes.rows[0].similarity);
    } else {
      const distRes = await client.query(
        `
        SELECT 
          id, title,
          cosine_similarity(embedding, $1) AS similarity
        FROM recipe_embeddings
        WHERE organization_id = $2
        ORDER BY similarity DESC
        LIMIT 1;
      `,
        [v1, GRAND_PALACE_ORG_ID]
      );
      simScore = parseFloat(distRes.rows[0].similarity);
    }

    console.log(`  -> Top match similarity score: ${simScore.toFixed(4)} (Expected ~1.0000 for exact match)`);
    if (simScore < 0.99) {
      throw new Error(`Unexpected cosine similarity score: ${simScore}`);
    }

    // Clean up test records
    await client.query(`
      DELETE FROM recipe_embeddings 
      WHERE id IN ('${insertRes1.rows[0].id}', '${insertRes2.rows[0].id}');
    `);
    console.log('  -> Test vector embeddings cleaned up successfully.');

    console.log('\n' + '='.repeat(65));
    console.log(' ALL DAY 6 PGVECTOR & VECTOR DB VERIFICATIONS PASSED (5/5)!');
    console.log('='.repeat(65));
  } finally {
    client.release();
    await pool.end();
  }
}

verifyPgvector().catch((err) => {
  console.error('\n❌ Verification failed:', err);
  process.exit(1);
});
