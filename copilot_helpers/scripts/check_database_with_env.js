// check_database_with_env.js
'use strict';

/**
 * Database schema check with proper environment variables from backend/.env
 */

// Load environment variables from backend/.env
require('dotenv').config({ path: './backend/.env' });

const { Pool } = require('pg');

async function checkDatabaseSchema() {
  console.log('🔍 Checking Database Schema for Full-Text Search Integration');
  console.log('=========================================================\n');

  // Show loaded environment variables
  console.log('🔧 Environment Configuration:');
  console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`  CLOUD_SQL_CONNECTION_NAME: ${process.env.CLOUD_SQL_CONNECTION_NAME}`);
  console.log(`  PG_USER: ${process.env.PG_USER}`);
  console.log(`  PG_HOST: ${process.env.PG_HOST}`);
  console.log(`  PG_DATABASE: ${process.env.PG_DATABASE}`);
  console.log(`  PG_PASSWORD: ${process.env.PG_PASSWORD ? '[SET]' : '[NOT SET]'}`);

  // Database configuration - use direct IP since we have it
  const dbConfig = {
    user: process.env.PG_USER,
    host: process.env.PG_HOST, // Direct IP
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: parseInt(process.env.PG_PORT) || 5432,
    ssl: false // Use this for development
  };
  
  console.log('\n📊 Database Connection Config:');
  console.log(`  Host: ${dbConfig.host}`);
  console.log(`  Port: ${dbConfig.port}`);
  console.log(`  Database: ${dbConfig.database}`);
  console.log(`  User: ${dbConfig.user}`);

  let pool;
  let client;

  try {
    console.log('\n🔌 Connecting to database...');
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
      console.log(`📊 Found ${tablesResult.rows.length} tables:`);
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_schema}.${row.table_name} (${row.table_type})`);
      });
    }

    // Check specifically for repo_data table for repository content search
    console.log('\n🔍 Checking for repo_data table...');
    const repoDataCheck = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'repo_data'
      );
    `;
    const repoDataResult = await client.query(repoDataCheck);
    const repoDataExists = repoDataResult.rows[0].exists;
    console.log(`📄 repo_data table exists: ${repoDataExists}`);

    if (repoDataExists) {
      // Get structure of repo_data table
      console.log('\n📋 repo_data table structure:');
      const columnsQuery = `
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'repo_data'
        ORDER BY ordinal_position;
      `;
      const columnsResult = await client.query(columnsQuery);
      columnsResult.rows.forEach(row => {
        const maxLength = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
        console.log(`  - ${row.column_name}: ${row.data_type}${maxLength} (nullable: ${row.is_nullable})`);
      });

      // Check if we have any data
      const countQuery = 'SELECT COUNT(*) as count FROM repo_data';
      const countResult = await client.query(countQuery);
      console.log(`📊 repo_data table has ${countResult.rows[0].count} rows`);

      // Check for existing text search indexes
      console.log('\n🔍 Checking for existing text search indexes...');
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
        console.log('📊 Found indexes on repo_data:');
        indexResult.rows.forEach(row => {
          const isTsVector = row.indexdef.includes('tsvector');
          const indexType = isTsVector ? '(🔍 TEXT SEARCH)' : '(🔢 REGULAR)';
          console.log(`  - ${row.indexname} ${indexType}`);
          if (isTsVector) {
            console.log(`    ${row.indexdef}`);
          }
        });
      } else {
        console.log('⚠️  No indexes found on repo_data table');
      }

      // Sample a few rows to understand the data structure
      if (countResult.rows[0].count > 0) {
        console.log('\n📄 Sample data from repo_data:');
        const sampleQuery = `
          SELECT 
            id,
            user_id,
            repo_id,
            file_path,
            LENGTH(content) as content_length,
            LEFT(content, 100) as content_preview,
            created_at
          FROM repo_data 
          ORDER BY created_at DESC 
          LIMIT 3;
        `;
        const sampleResult = await client.query(sampleQuery);
        sampleResult.rows.forEach((row, index) => {
          console.log(`  ${index + 1}. ID: ${row.id}, User: ${row.user_id}, Repo: ${row.repo_id}`);
          console.log(`     File: ${row.file_path || 'N/A'}`);
          console.log(`     Content: ${row.content_length} chars, Preview: "${row.content_preview}..."`);
          console.log(`     Created: ${row.created_at}`);
        });
      }
    }

    // Also check the git.repositories table for existing repo data
    console.log('\n🔍 Checking git.repositories table...');
    const gitReposQuery = `
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'git' AND table_name = 'repositories'
      ORDER BY ordinal_position;
    `;
    const gitReposResult = await client.query(gitReposQuery);
    if (gitReposResult.rows.length > 0) {
      console.log('📋 git.repositories table structure:');
      gitReposResult.rows.forEach(row => {
        const maxLength = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
        console.log(`  - ${row.column_name}: ${row.data_type}${maxLength} (nullable: ${row.is_nullable})`);
      });

      // Check repo count and sample data
      const repoCountQuery = 'SELECT COUNT(*) as count FROM git.repositories';
      const repoCountResult = await client.query(repoCountQuery);
      console.log(`📊 git.repositories table has ${repoCountResult.rows[0].count} rows`);

      if (repoCountResult.rows[0].count > 0) {
        console.log('\n📄 Sample data from git.repositories:');
        const repoSampleQuery = `
          SELECT 
            user_id,
            repo_id,
            LENGTH(data::text) as data_size,
            created_at,
            updated_at
          FROM git.repositories 
          ORDER BY updated_at DESC 
          LIMIT 3;
        `;
        const repoSampleResult = await client.query(repoSampleQuery);
        repoSampleResult.rows.forEach((row, index) => {
          console.log(`  ${index + 1}. User: ${row.user_id}, Repo: ${row.repo_id}`);
          console.log(`     Data size: ${row.data_size} chars`);
          console.log(`     Updated: ${row.updated_at}`);
        });
      }
    }

    // Check PostgreSQL text search capabilities
    console.log('\n🔍 Checking PostgreSQL text search capabilities...');
    const textSearchQuery = `
      SELECT 
        cfgname as config_name
      FROM pg_ts_config 
      WHERE cfgname IN ('english', 'simple')
      ORDER BY cfgname;
    `;
    const textSearchResult = await client.query(textSearchQuery);
    if (textSearchResult.rows.length > 0) {
      console.log('✅ PostgreSQL full-text search configurations available:');
      textSearchResult.rows.forEach(row => {
        console.log(`  - ${row.config_name}`);
      });
    } else {
      console.log('⚠️  PostgreSQL full-text search configurations not found');
    }

    // Check for any existing text search columns
    if (repoDataExists) {
      console.log('\n🔍 Checking for tsvector columns in repo_data...');
      const tsvectorQuery = `
        SELECT 
          column_name,
          data_type
        FROM information_schema.columns 
        WHERE table_name = 'repo_data'
        AND data_type = 'tsvector';
      `;
      const tsvectorResult = await client.query(tsvectorQuery);
      if (tsvectorResult.rows.length > 0) {
        console.log('✅ Found tsvector columns:');
        tsvectorResult.rows.forEach(row => {
          console.log(`  - ${row.column_name}: ${row.data_type}`);
        });
      } else {
        console.log('💡 No tsvector columns found - we can add them for full-text search');
      }
    }

    console.log('\n✅ Database schema analysis completed successfully');
    console.log('\n📝 Full-Text Search Integration Plan:');
    if (repoDataExists) {
      console.log('1. ✅ repo_data table exists - good foundation');
      console.log('2. 💡 Add tsvector column for full-text search on file content');
      console.log('3. 💡 Create GIN index on tsvector column for fast searches');
      console.log('4. 💡 Add triggers to automatically update tsvector when content changes');
      console.log('5. 💡 Integrate with existing TextSearchService');
      console.log('6. 💡 Update query RAG pipeline to use PostgreSQL text search');
    } else {
      console.log('1. ⚠️  Need to create repo_data table first');
      console.log('2. 💡 Add columns: id, user_id, repo_id, file_path, content, content_vector (tsvector)');
      console.log('3. 💡 Set up full-text search from the start');
      console.log('4. 💡 Consider extracting data from git.repositories into searchable format');
    }

  } catch (error) {
    console.error('❌ Error checking database schema:', error.message);
    throw error;
  } finally {
    if (client) client.release();
    if (pool) await pool.end();
  }
}

// Install dotenv if needed
async function ensureDotenv() {
  try {
    require('dotenv');
    return true;
  } catch (error) {
    console.log('Installing dotenv...');
    const { exec } = require('child_process');
    return new Promise((resolve) => {
      exec('npm install dotenv', (error) => {
        if (error) {
          console.log('❌ Failed to install dotenv. Please run: npm install dotenv');
          resolve(false);
        } else {
          console.log('✅ dotenv installed');
          delete require.cache[require.resolve('dotenv')];
          resolve(true);
        }
      });
    });
  }
}

// Run the schema check
async function main() {
  const dotenvOk = await ensureDotenv();
  if (dotenvOk) {
    await checkDatabaseSchema();
  }
}

main().catch(error => {
  console.error('❌ Failed to check database schema:', {
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});