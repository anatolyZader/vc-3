// check_database_schema.js
'use strict';

/**
 * Script to check the current database schema for planning PostgreSQL full-text search integration
 * This uses the Cloud SQL Auth Proxy connection method similar to debug_conversation_history.js
 */

const { Pool } = require('pg');

async function checkDatabaseSchema() {
  console.log('🔍 Checking Database Schema for Full-Text Search Integration');
  console.log('=========================================================\n');

  // Database configuration using Cloud SQL Auth Proxy
  const dbConfig = {
    user: process.env.PG_USER || 'postgres',
    host: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME || 'eventstorm-1:me-west1:eventstorm-pg-instance-1'}`,
    database: process.env.PG_DATABASE || 'eventstorm_db',
    password: process.env.PG_PASSWORD,
    port: 5432,
  };
  
  console.log('📊 Database Config:');
  console.log(`  User: ${dbConfig.user}`);
  console.log(`  Host: ${dbConfig.host}`);
  console.log(`  Database: ${dbConfig.database}`);
  console.log(`  Password: ${dbConfig.password ? '[SET]' : '[NOT SET]'}`);

  let pool;
  let client;

  try {
    console.log('\n🔌 Testing database connection...');
    pool = new Pool(dbConfig);
    client = await pool.connect();
    console.log('✅ Database connection established');

    // Check schemas
    console.log('\n🏗️ Checking available schemas...');
    const schemasQuery = `
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast');
    `;
    const schemasResult = await client.query(schemasQuery);
    console.log('📊 Available schemas:');
    schemasResult.rows.forEach(row => {
      console.log(`  - ${row.schema_name}`);
    });

    // Check all tables across schemas
    console.log('\n📋 Checking all tables...');
    const tablesQuery = `
      SELECT 
        table_schema,
        table_name,
        table_type
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY table_schema, table_name;
    `;
    const tablesResult = await client.query(tablesQuery);
    
    if (tablesResult.rows.length === 0) {
      console.log('⚠️  No user tables found in the database');
    } else {
      console.log('📊 Found tables:');
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_schema}.${row.table_name} (${row.table_type})`);
      });
    }

    // Check specifically for docs_data table that we saw in the code
    console.log('\n🔍 Checking for docs_data table...');
    const docsDataCheck = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'docs_data'
      );
    `;
    const docsDataResult = await client.query(docsDataCheck);
    const docsDataExists = docsDataResult.rows[0].exists;
    console.log(`📄 docs_data table exists: ${docsDataExists}`);

    if (docsDataExists) {
      // Get structure of docs_data table
      console.log('\n📋 docs_data table structure:');
      const columnsQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'docs_data'
        ORDER BY ordinal_position;
      `;
      const columnsResult = await client.query(columnsQuery);
      columnsResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });

      // Check if we have any data
      const countQuery = 'SELECT COUNT(*) as count FROM docs_data';
      const countResult = await client.query(countQuery);
      console.log(`📊 docs_data table has ${countResult.rows[0].count} rows`);

      // Check for existing text search indexes
      console.log('\n🔍 Checking for existing text search indexes...');
      const indexQuery = `
        SELECT 
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE tablename = 'docs_data'
        AND indexdef LIKE '%tsvector%';
      `;
      const indexResult = await client.query(indexQuery);
      if (indexResult.rows.length > 0) {
        console.log('📊 Found text search indexes:');
        indexResult.rows.forEach(row => {
          console.log(`  - ${row.indexname}: ${row.indexdef}`);
        });
      } else {
        console.log('⚠️  No text search indexes found');
      }
    }

    // Check git schema tables
    console.log('\n🔍 Checking git schema tables...');
    const gitTablesQuery = `
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'git'
      ORDER BY table_name;
    `;
    const gitTablesResult = await client.query(gitTablesQuery);
    if (gitTablesResult.rows.length > 0) {
      console.log('📊 Git schema tables:');
      gitTablesResult.rows.forEach(row => {
        console.log(`  - git.${row.table_name}`);
      });
    } else {
      console.log('⚠️  No git schema tables found');
    }

    // Check PostgreSQL text search capabilities
    console.log('\n🔍 Checking PostgreSQL text search capabilities...');
    const textSearchQuery = `
      SELECT 
        cfgname as config_name,
        cfgowner as owner
      FROM pg_ts_config 
      WHERE cfgname = 'english';
    `;
    const textSearchResult = await client.query(textSearchQuery);
    if (textSearchResult.rows.length > 0) {
      console.log('✅ PostgreSQL full-text search (English) is available');
    } else {
      console.log('⚠️  PostgreSQL full-text search configuration not found');
    }

    console.log('\n✅ Database schema check completed successfully');

  } catch (error) {
    console.error('❌ Error checking database schema:', error.message);
    throw error;
  } finally {
    if (client) client.release();
    if (pool) await pool.end();
  }
}

// Run the schema check
checkDatabaseSchema().catch(error => {
  console.error('❌ Failed to check database schema:', {
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});