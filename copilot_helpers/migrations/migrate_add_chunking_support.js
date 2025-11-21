// migrate_add_chunking_support.js
'use strict';

/**
 * Add chunking support to repo_data table
 * This migration adds columns to support synchronized chunking between Pinecone and PostgreSQL
 */

require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

async function migrateAddChunkingSupport() {
  console.log('🔄 Adding Chunking Support to repo_data Table');
  console.log('===============================================\n');

  const dbConfig = {
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: parseInt(process.env.PG_PORT) || 5432,
    ssl: false
  };

  let pool;
  let client;

  try {
    console.log('🔌 Connecting to database...');
    pool = new Pool(dbConfig);
    client = await pool.connect();
    console.log('✅ Database connection established\n');

    // Check current schema
    console.log('🔍 Checking current table schema...');
    const schemaCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'repo_data'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Current columns:');
    schemaCheck.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    // Begin migration
    console.log('\n🚀 Starting schema migration...\n');
    await client.query('BEGIN');

    // Step 1: Add new columns for chunking support
    console.log('📝 Step 1: Adding chunk-related columns...');
    
    // Check if columns already exist
    const chunkIndexExists = schemaCheck.rows.some(row => row.column_name === 'chunk_index');
    
    if (!chunkIndexExists) {
      await client.query(`
        ALTER TABLE repo_data
        ADD COLUMN chunk_index INTEGER DEFAULT 0,
        ADD COLUMN chunk_content TEXT,
        ADD COLUMN chunk_tokens INTEGER,
        ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
      `);
      console.log('✅ Added: chunk_index, chunk_content, chunk_tokens, metadata');
    } else {
      console.log('⚠️  Chunk columns already exist, skipping...');
    }

    // Step 2: Migrate existing data to new structure
    console.log('\n📝 Step 2: Migrating existing data...');
    const migrateResult = await client.query(`
      UPDATE repo_data
      SET 
        chunk_content = content,
        chunk_tokens = LENGTH(content) / 4,  -- Rough estimate: 1 token ≈ 4 chars
        metadata = jsonb_build_object(
          'type', 'github-code',
          'file_extension', file_extension,
          'migrated', true,
          'migrated_at', NOW()
        )
      WHERE chunk_content IS NULL;
    `);
    console.log(`✅ Migrated ${migrateResult.rowCount} existing records`);

    // Step 3: Drop old unique constraint and add new one
    console.log('\n📝 Step 3: Updating constraints...');
    try {
      // Drop old constraint
      await client.query(`
        ALTER TABLE repo_data
        DROP CONSTRAINT IF EXISTS repo_data_user_id_repo_id_file_path_key;
      `);
      console.log('✅ Removed old unique constraint');

      // Add new constraint with chunk_index
      await client.query(`
        ALTER TABLE repo_data
        ADD CONSTRAINT repo_data_user_id_repo_id_file_path_chunk_idx_key
        UNIQUE (user_id, repo_id, file_path, chunk_index);
      `);
      console.log('✅ Added new unique constraint with chunk_index');
    } catch (constraintError) {
      console.log('⚠️  Constraint update issue (may already exist):', constraintError.message);
    }

    // Step 4: Create/update indexes
    console.log('\n📝 Step 4: Creating/updating indexes...');
    
    // Drop old content_vector column and recreate as generated
    try {
      await client.query(`
        ALTER TABLE repo_data
        DROP COLUMN IF EXISTS content_vector CASCADE;
      `);
      
      await client.query(`
        ALTER TABLE repo_data
        ADD COLUMN content_vector tsvector
        GENERATED ALWAYS AS (
          to_tsvector('english', 
            COALESCE(file_path, '') || ' ' || 
            COALESCE(chunk_content, '') || ' ' ||
            COALESCE(metadata->>'semantic_tags', '') || ' ' ||
            COALESCE(metadata->>'ubiquitous_language', '') || ' ' ||
            COALESCE(metadata->>'function_names', '') || ' ' ||
            COALESCE(metadata->>'class_names', '')
          )
        ) STORED;
      `);
      console.log('✅ Recreated content_vector as generated column with metadata support');
    } catch (vectorError) {
      console.log('⚠️  Vector column issue:', vectorError.message);
    }

    // Create GIN indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_repo_data_content_vector 
      ON repo_data USING GIN(content_vector);
    `);
    console.log('✅ Created GIN index on content_vector');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_repo_data_metadata 
      ON repo_data USING GIN(metadata);
    `);
    console.log('✅ Created GIN index on metadata');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_repo_data_file_path 
      ON repo_data(file_path);
    `);
    console.log('✅ Created index on file_path');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_repo_data_user_repo_chunk 
      ON repo_data(user_id, repo_id, chunk_index);
    `);
    console.log('✅ Created composite index on user_id, repo_id, chunk_index');

    // Commit transaction
    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully!\n');

    // Verify final schema
    console.log('🔍 Verifying final schema...');
    const finalSchema = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'repo_data'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Final columns:');
    finalSchema.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    // Show stats
    console.log('\n📊 Current data statistics:');
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT repo_id) as unique_repos,
        COUNT(DISTINCT file_path) as unique_files,
        AVG(chunk_tokens) as avg_chunk_tokens,
        MAX(chunk_index) as max_chunk_index
      FROM repo_data;
    `);
    
    const stat = stats.rows[0];
    console.log(`  Total records: ${stat.total_records}`);
    console.log(`  Unique users: ${stat.unique_users}`);
    console.log(`  Unique repos: ${stat.unique_repos}`);
    console.log(`  Unique files: ${stat.unique_files}`);
    console.log(`  Avg chunk tokens: ${Math.round(stat.avg_chunk_tokens || 0)}`);
    console.log(`  Max chunk index: ${stat.max_chunk_index || 0}`);

    console.log('\n🎉 Database is ready for synchronized chunking!');
    console.log('\n📝 Next steps:');
    console.log('1. Update contextPipeline.js to store chunks to PostgreSQL');
    console.log('2. Enhance textSearchService.js with storeChunks() method');
    console.log('3. Re-process repositories to populate with chunked data');

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    if (client) client.release();
    if (pool) await pool.end();
  }
}

// Run the migration
migrateAddChunkingSupport().catch(error => {
  console.error('❌ Migration execution failed:', {
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});
