// migrate_git_data_to_repo_data.js
'use strict';

/**
 * Migrate data from git.repositories JSONB to repo_data table for full-text search
 * This extracts file content from the JSONB structure and populates searchable format
 */

// Load environment variables from backend/.env
require('dotenv').config({ path: './backend/.env' });

const { Pool } = require('pg');

async function migrateGitDataToRepoData() {
  console.log('🔄 Migrating Git Repository Data to repo_data Table');
  console.log('==================================================\n');

  // Database configuration
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

    // Check existing data in git.repositories
    console.log('\n📊 Checking existing git.repositories data...');
    const gitDataQuery = `
      SELECT 
        user_id,
        repo_id,
        jsonb_pretty(data) as sample_data,
        LENGTH(data::text) as data_size
      FROM git.repositories 
      LIMIT 1;
    `;
    const gitDataResult = await client.query(gitDataQuery);
    
    if (gitDataResult.rows.length === 0) {
      console.log('⚠️  No data found in git.repositories table');
      return;
    }

    const repoData = gitDataResult.rows[0];
    console.log(`📄 Found repository: ${repoData.repo_id}`);
    console.log(`📊 Data size: ${repoData.data_size} characters`);
    
    // Show a small sample of the JSONB structure
    console.log('\n📋 Sample JSONB structure (first 500 chars):');
    console.log(repoData.sample_data.substring(0, 500) + '...');

    // Analyze the JSONB structure to understand how to extract files
    console.log('\n🔍 Analyzing JSONB structure...');
    const structureQuery = `
      SELECT 
        user_id,
        repo_id,
        jsonb_typeof(data) as root_type,
        jsonb_object_keys(data) as root_keys
      FROM git.repositories 
      WHERE repo_id = $1;
    `;
    const structureResult = await client.query(structureQuery, [repoData.repo_id]);
    
    if (structureResult.rows.length > 0) {
      console.log('📊 JSONB structure analysis:');
      console.log(`  Root type: ${structureResult.rows[0].root_type}`);
      console.log('  Root keys found:');
      
      // Get all unique keys
      const keysQuery = `
        SELECT DISTINCT jsonb_object_keys(data) as key_name
        FROM git.repositories 
        WHERE repo_id = $1
        ORDER BY key_name;
      `;
      const keysResult = await client.query(keysQuery, [repoData.repo_id]);
      keysResult.rows.forEach(row => {
        console.log(`    - ${row.key_name}`);
      });
    }

    // Try to extract file content - this depends on your JSONB structure
    console.log('\n📁 Attempting to extract file content...');
    
    // Common patterns for repository JSONB data:
    // Pattern 1: files at root level
    // Pattern 2: files under 'files' key
    // Pattern 3: tree structure with 'tree' key
    
    const extractionQueries = [
      {
        name: 'Direct files pattern',
        query: `
          SELECT 
            user_id,
            repo_id,
            key as file_path,
            value as content
          FROM git.repositories, 
               jsonb_each_text(data) 
          WHERE repo_id = $1
          AND jsonb_typeof(value::jsonb) = 'string'
          AND LENGTH(value) > 10
          LIMIT 5;
        `
      },
      {
        name: 'Files under "files" key',
        query: `
          SELECT 
            user_id,
            repo_id,
            key as file_path,
            value as content
          FROM git.repositories, 
               jsonb_each_text(data->'files') 
          WHERE repo_id = $1
          AND data ? 'files'
          AND jsonb_typeof(value::jsonb) = 'string'
          LIMIT 5;
        `
      },
      {
        name: 'Tree structure pattern',
        query: `
          SELECT 
            user_id,
            repo_id,
            key as file_path,
            value as content
          FROM git.repositories, 
               jsonb_each_text(data->'tree') 
          WHERE repo_id = $1
          AND data ? 'tree'
          AND jsonb_typeof(value::jsonb) = 'string'
          LIMIT 5;
        `
      }
    ];

    let extractedFiles = [];
    let workingPattern = null;

    for (const pattern of extractionQueries) {
      try {
        console.log(`  Testing: ${pattern.name}`);
        const result = await client.query(pattern.query, [repoData.repo_id]);
        
        if (result.rows.length > 0) {
          console.log(`    ✅ Found ${result.rows.length} files with this pattern`);
          extractedFiles = result.rows;
          workingPattern = pattern.name;
          
          // Show sample extracted files
          result.rows.forEach((row, index) => {
            const contentPreview = row.content.substring(0, 100).replace(/\n/g, '\\n');
            console.log(`      ${index + 1}. ${row.file_path} (${row.content.length} chars): "${contentPreview}..."`);
          });
          break;
        } else {
          console.log(`    ⚠️  No files found with this pattern`);
        }
      } catch (error) {
        console.log(`    ❌ Pattern failed: ${error.message}`);
      }
    }

    if (extractedFiles.length === 0) {
      console.log('\n❌ Could not extract files from JSONB structure');
      console.log('💡 You may need to customize the extraction query based on your specific JSONB format');
      console.log('📋 Consider examining the JSONB structure manually to determine the correct path');
      return;
    }

    console.log(`\n✅ Successfully identified extraction pattern: ${workingPattern}`);
    console.log(`📁 Found ${extractedFiles.length} sample files`);

    // Ask for confirmation before proceeding with full migration
    console.log('\n⚠️  This will extract and insert ALL files from git.repositories into repo_data');
    console.log('💡 For now, this is a dry run. To enable actual migration, uncomment the insertion code.');

    // TODO: Uncomment and customize this section based on your JSONB structure
    /*
    console.log('\n🔄 Starting full migration...');
    
    const fullExtractionQuery = `
      INSERT INTO repo_data (user_id, repo_id, file_path, file_extension, content, content_vector, language)
      SELECT 
        user_id,
        repo_id,
        key as file_path,
        CASE 
          WHEN key LIKE '%.js' THEN 'js'
          WHEN key LIKE '%.ts' THEN 'ts'
          WHEN key LIKE '%.py' THEN 'py'
          WHEN key LIKE '%.md' THEN 'md'
          WHEN key LIKE '%.json' THEN 'json'
          ELSE 'txt'
        END as file_extension,
        value as content,
        to_tsvector('english', key || ' ' || value) as content_vector,
        'english' as language
      FROM git.repositories, 
           jsonb_each_text(data) -- Customize this based on your working pattern
      WHERE jsonb_typeof(value::jsonb) = 'string'
      AND LENGTH(value) > 10
      ON CONFLICT (user_id, repo_id, file_path) DO UPDATE SET
        content = EXCLUDED.content,
        content_vector = EXCLUDED.content_vector,
        updated_at = CURRENT_TIMESTAMP;
    `;
    
    const migrationResult = await client.query(fullExtractionQuery);
    console.log(`✅ Migration completed: ${migrationResult.rowCount} files migrated`);
    */

    console.log('\n📝 Migration Analysis Complete');
    console.log('🔧 To complete the migration:');
    console.log('1. Review the working pattern above');
    console.log('2. Customize the extraction query for your JSONB structure');
    console.log('3. Uncomment the migration code');
    console.log('4. Run the migration again');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    if (client) client.release();
    if (pool) await pool.end();
  }
}

// Run the migration analysis
migrateGitDataToRepoData().catch(error => {
  console.error('❌ Migration execution failed:', {
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});