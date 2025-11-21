// run_database_migration.js
'use strict';

/**
 * Run database migration to create repo_data table with PostgreSQL full-text search
 */

// Load environment variables from backend/.env
require('dotenv').config({ path: './backend/.env' });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 Running Database Migration: Create repo_data table');
  console.log('===================================================\n');

  // Database configuration - use direct IP since we have it
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
    console.log('✅ Database connection established');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'database_migrations', '001_create_repo_data_table.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`📝 Migration SQL loaded (${migrationSQL.length} characters)`);

    // Execute the migration in a transaction
    console.log('\n🔄 Executing migration...');
    await client.query('BEGIN');

    try {
      // For PostgreSQL, we need to execute the entire SQL as one statement
      // because it contains function definitions
      console.log('📋 Executing migration SQL...');
      await client.query(migrationSQL);

      await client.query('COMMIT');
      console.log('✅ Migration completed successfully');

      // Verify the table was created
      console.log('\n🔍 Verifying table creation...');
      const verifyQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'repo_data'
        ORDER BY ordinal_position;
      `;
      const verifyResult = await client.query(verifyQuery);
      
      if (verifyResult.rows.length > 0) {
        console.log('✅ repo_data table created successfully:');
        verifyResult.rows.forEach(row => {
          console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
      } else {
        console.log('❌ repo_data table not found after migration');
      }

      // Check indexes
      console.log('\n🔍 Checking created indexes...');
      const indexQuery = `
        SELECT 
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE tablename = 'repo_data'
        ORDER BY indexname;
      `;
      const indexResult = await client.query(indexQuery);
      
      if (indexResult.rows.length > 0) {
        console.log('✅ Indexes created:');
        indexResult.rows.forEach(row => {
          const isTextSearch = row.indexdef.includes('gin') && row.indexdef.includes('content_vector');
          const indexType = isTextSearch ? '(🔍 TEXT SEARCH GIN)' : '(🔢 REGULAR)';
          console.log(`  - ${row.indexname} ${indexType}`);
        });
      }

      // Check trigger function
      console.log('\n🔍 Checking trigger function...');
      const triggerQuery = `
        SELECT 
          trigger_name,
          event_manipulation,
          action_timing
        FROM information_schema.triggers 
        WHERE table_name = 'repo_data';
      `;
      const triggerResult = await client.query(triggerQuery);
      
      if (triggerResult.rows.length > 0) {
        console.log('✅ Triggers created:');
        triggerResult.rows.forEach(row => {
          console.log(`  - ${row.trigger_name}: ${row.action_timing} ${row.event_manipulation}`);
        });
      } else {
        console.log('ℹ️  No triggers found (this is OK if triggers were not included in this migration)');
      }

      console.log('\n🎉 Database migration completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('1. ✅ repo_data table with full-text search is ready');
      console.log('2. 💡 Create data migration script to populate from git.repositories');
      console.log('3. 💡 Update TextSearchService to use repo_data table');
      console.log('4. 💡 Integrate with query RAG pipeline');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    if (client) client.release();
    if (pool) await pool.end();
  }
}

// Run the migration
runMigration().catch(error => {
  console.error('❌ Migration execution failed:', {
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});