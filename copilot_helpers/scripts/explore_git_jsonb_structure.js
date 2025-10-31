// explore_git_jsonb_structure.js
'use strict';

/**
 * Explore the git.repositories JSONB structure to understand how files are stored
 */

// Load environment variables from backend/.env
require('dotenv').config({ path: './backend/.env' });

const { Pool } = require('pg');

async function exploreGitJsonbStructure() {
  console.log('🔍 Exploring git.repositories JSONB Structure');
  console.log('============================================\n');

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

    // Get the repository data
    const repoQuery = `
      SELECT 
        user_id,
        repo_id,
        data
      FROM git.repositories 
      LIMIT 1;
    `;
    const repoResult = await client.query(repoQuery);
    
    if (repoResult.rows.length === 0) {
      console.log('⚠️  No data found');
      return;
    }

    const repo = repoResult.rows[0];
    console.log(`📄 Repository: ${repo.repo_id}`);

    // Explore the main keys
    console.log('\n🔍 Main JSONB keys:');
    const mainKeysQuery = `
      SELECT 
        jsonb_object_keys(data) as key_name,
        jsonb_typeof(data->jsonb_object_keys(data)) as value_type
      FROM git.repositories 
      WHERE repo_id = $1;
    `;
    const mainKeysResult = await client.query(mainKeysQuery, [repo.repo_id]);
    mainKeysResult.rows.forEach(row => {
      console.log(`  - ${row.key_name}: ${row.value_type}`);
    });

    // Check if 'codebase' contains the files
    console.log('\n🔍 Exploring "codebase" structure...');
    const codebaseQuery = `
      SELECT 
        jsonb_typeof(data->'codebase') as codebase_type,
        jsonb_object_keys(data->'codebase') as codebase_keys
      FROM git.repositories 
      WHERE repo_id = $1
      AND data ? 'codebase';
    `;
    const codebaseResult = await client.query(codebaseQuery, [repo.repo_id]);
    
    if (codebaseResult.rows.length > 0) {
      console.log('📊 Codebase structure:');
      
      // Get all unique codebase keys
      const codebaseKeysQuery = `
        SELECT DISTINCT jsonb_object_keys(data->'codebase') as key_name
        FROM git.repositories 
        WHERE repo_id = $1
        ORDER BY key_name;
      `;
      const codebaseKeysResult = await client.query(codebaseKeysQuery, [repo.repo_id]);
      codebaseKeysResult.rows.forEach(row => {
        console.log(`  - ${row.key_name}`);
      });

      // Check if any of these keys contain file-like data
      console.log('\n🔍 Checking for file content in codebase keys...');
      for (const keyRow of codebaseKeysResult.rows.slice(0, 5)) { // Check first 5 keys
        const key = keyRow.key_name;
        const contentCheckQuery = `
          SELECT 
            '${key}' as key_name,
            jsonb_typeof(data->'codebase'->'${key}') as value_type,
            LENGTH(data->'codebase'->'${key}'::text) as content_length,
            LEFT(data->'codebase'->'${key}'::text, 200) as content_preview
          FROM git.repositories 
          WHERE repo_id = $1;
        `;
        
        try {
          const contentResult = await client.query(contentCheckQuery, [repo.repo_id]);
          if (contentResult.rows.length > 0) {
            const content = contentResult.rows[0];
            console.log(`    ${key}:`);
            console.log(`      Type: ${content.value_type}`);
            console.log(`      Length: ${content.content_length} chars`);
            console.log(`      Preview: ${content.content_preview?.substring(0, 100)}...`);
            
            // Check if this looks like file content
            const preview = content.content_preview || '';
            if (preview.includes('function') || preview.includes('class') || preview.includes('import') || preview.includes('const')) {
              console.log(`      🎯 LIKELY FILE CONTENT!`);
            }
          }
        } catch (error) {
          console.log(`    ${key}: Error accessing content`);
        }
      }
    }

    // Check repository structure
    console.log('\n🔍 Exploring "repository" structure...');
    const repositoryQuery = `
      SELECT 
        jsonb_typeof(data->'repository') as repo_type,
        jsonb_object_keys(data->'repository') as repo_keys
      FROM git.repositories 
      WHERE repo_id = $1
      AND data ? 'repository';
    `;
    const repositoryResult = await client.query(repositoryQuery, [repo.repo_id]);
    
    if (repositoryResult.rows.length > 0) {
      const repoKeysQuery = `
        SELECT DISTINCT jsonb_object_keys(data->'repository') as key_name
        FROM git.repositories 
        WHERE repo_id = $1
        ORDER BY key_name;
      `;
      const repoKeysResult = await client.query(repoKeysQuery, [repo.repo_id]);
      console.log('📊 Repository keys:');
      repoKeysResult.rows.forEach(row => {
        console.log(`  - ${row.key_name}`);
      });
    }

    // Try to find any string values that look like file content
    console.log('\n🔍 Searching for file-like content patterns...');
    const searchQuery = `
      WITH RECURSIVE extract_strings AS (
        SELECT 
          data as json_data,
          'root' as path
        FROM git.repositories 
        WHERE repo_id = $1
      )
      SELECT 
        'File-like content found' as status
      WHERE EXISTS (
        SELECT 1 
        FROM git.repositories 
        WHERE repo_id = $1
        AND data::text ILIKE '%function%'
        AND data::text ILIKE '%class%'
      );
    `;
    const searchResult = await client.query(searchQuery, [repo.repo_id]);
    
    if (searchResult.rows.length > 0) {
      console.log('✅ File-like content detected in JSONB');
      
      // Try to extract paths that contain code
      console.log('\n🔍 Looking for code file patterns...');
      const patternsToCheck = [
        { name: 'JavaScript files', pattern: '\\.js' },
        { name: 'TypeScript files', pattern: '\\.ts' },
        { name: 'Python files', pattern: '\\.py' },
        { name: 'Markdown files', pattern: '\\.md' },
        { name: 'JSON files', pattern: '\\.json' }
      ];

      for (const pattern of patternsToCheck) {
        const patternQuery = `
          SELECT COUNT(*) as count
          FROM git.repositories 
          WHERE repo_id = $1
          AND data::text ~ '${pattern.pattern}';
        `;
        const patternResult = await client.query(patternQuery, [repo.repo_id]);
        console.log(`  ${pattern.name}: ${patternResult.rows[0].count > 0 ? '✅ Found' : '❌ Not found'}`);
      }
    }

    // Show a larger sample of the JSONB to understand structure
    console.log('\n📋 Raw JSONB sample (codebase section):');
    const sampleQuery = `
      SELECT 
        jsonb_pretty(data->'codebase') as codebase_sample
      FROM git.repositories 
      WHERE repo_id = $1;
    `;
    const sampleResult = await client.query(sampleQuery, [repo.repo_id]);
    if (sampleResult.rows.length > 0) {
      const sample = sampleResult.rows[0].codebase_sample;
      if (sample) {
        // Show first 1000 characters of the codebase structure
        console.log(sample.substring(0, 1000) + '...');
      } else {
        console.log('No codebase data found');
      }
    }

    console.log('\n📝 Next steps:');
    console.log('1. Review the structure above to identify where file content is stored');
    console.log('2. Look for patterns like file paths as keys and content as values');
    console.log('3. Update the migration script with the correct JSONB path');

  } catch (error) {
    console.error('❌ Exploration failed:', error.message);
    throw error;
  } finally {
    if (client) client.release();
    if (pool) await pool.end();
  }
}

// Run the exploration
exploreGitJsonbStructure().catch(error => {
  console.error('❌ Exploration failed:', {
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});