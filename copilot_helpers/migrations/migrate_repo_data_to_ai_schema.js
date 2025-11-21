// migrate_repo_data_to_ai_schema.js
// Move repo_data table from public schema to ai schema for clear separation:
// - git.* tables: Full repository files (no chunking)
// - ai.* tables: Chunked data for RAG pipelines

require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

async function migrateToAiSchema() {
  const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: parseInt(process.env.PG_PORT) || 5432
  });

  const client = await pool.connect();

  try {
    console.log('🔄 Migrating repo_data from public to ai schema\n');

    // Step 1: Check current state
    console.log('1️⃣ Checking current state...');
    const checkPublic = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'repo_data'
    `);
    
    const checkAi = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'ai' AND table_name = 'repo_data'
    `);
    
    console.log(`   📊 public.repo_data exists: ${checkPublic.rows[0].count > 0}`);
    console.log(`   📊 ai.repo_data exists: ${checkAi.rows[0].count > 0}`);

    if (checkAi.rows[0].count > 0) {
      console.log('\n⚠️  ai.repo_data already exists! Skipping migration.');
      console.log('   If you want to re-migrate, first run:');
      console.log('   DROP TABLE ai.repo_data CASCADE;');
      await pool.end();
      return;
    }

    if (checkPublic.rows[0].count === 0) {
      console.log('\n❌ public.repo_data does not exist!');
      await pool.end();
      return;
    }

    // Step 2: Begin transaction
    await client.query('BEGIN');
    console.log('\n2️⃣ Starting transaction...');

    // Step 3: Move table to ai schema
    console.log('\n3️⃣ Moving table to ai schema...');
    await client.query(`
      ALTER TABLE public.repo_data SET SCHEMA ai;
    `);
    console.log('   ✅ Table moved to ai.repo_data');

    // Step 4: Verify the move
    console.log('\n4️⃣ Verifying migration...');
    const verifyAi = await client.query(`
      SELECT 
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as users,
        COUNT(DISTINCT repo_id) as repos
      FROM ai.repo_data
    `);
    
    console.log(`   ✅ ai.repo_data verified:`);
    console.log(`      - Total chunks: ${verifyAi.rows[0].count}`);
    console.log(`      - Users: ${verifyAi.rows[0].users}`);
    console.log(`      - Repositories: ${verifyAi.rows[0].repos}`);

    // Step 5: Verify triggers and indexes moved
    const checkTriggers = await client.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE event_object_schema = 'ai' 
        AND event_object_table = 'repo_data'
    `);
    
    console.log(`\n5️⃣ Triggers on ai.repo_data:`, checkTriggers.rows.map(r => r.trigger_name));

    const checkIndexes = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'ai' 
        AND tablename = 'repo_data'
    `);
    
    console.log(`\n6️⃣ Indexes on ai.repo_data:`, checkIndexes.rows.map(r => r.indexname));

    // Step 6: Commit transaction
    await client.query('COMMIT');
    console.log('\n✅ Migration complete! repo_data is now in ai schema.');

    console.log('\n📋 Next steps:');
    console.log('   1. Update all queries to use ai.repo_data');
    console.log('   2. Test RAG pipelines');
    console.log('   3. Trigger re-indexing to populate with fresh chunks');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateToAiSchema();
