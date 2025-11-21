// migrate_repo_files_to_search.js
'use strict';

/**
 * Extract files from git.repositories codebase.files array and populate repo_data for full-text search
 */

// Load environment variables from backend/.env
require('dotenv').config({ path: './backend/.env' });

const { Pool } = require('pg');

async function migrateRepoFilesToSearch() {
  console.log('🔄 Migrating Repository Files to repo_data for Full-Text Search');
  console.log('=============================================================\n');

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

    // First, let's explore the files structure
    console.log('\n🔍 Analyzing files in git.repositories...');
    const analyzeQuery = `
      SELECT 
        user_id,
        repo_id,
        jsonb_array_length(data->'codebase'->'files') as file_count,
        data->'codebase'->'branchName' as branch_name,
        data->'codebase'->'commitSha' as commit_sha
      FROM git.repositories;
    `;
    const analyzeResult = await client.query(analyzeQuery);
    
    if (analyzeResult.rows.length === 0) {
      console.log('⚠️  No repositories found');
      return;
    }

    analyzeResult.rows.forEach(row => {
      console.log(`📄 Repository: ${row.repo_id}`);
      console.log(`  User: ${row.user_id}`);
      console.log(`  Branch: ${row.branch_name || 'unknown'}`);
      console.log(`  Files: ${row.file_count}`);
      console.log(`  Commit: ${row.commit_sha ? String(row.commit_sha).substring(0, 8) + '...' : 'unknown'}`);
    });

    // Show sample files
    console.log('\n📋 Sample files structure:');
    const sampleQuery = `
      SELECT 
        file_data->>'path' as file_path,
        file_data->>'name' as file_name,
        (file_data->>'size')::int as file_size,
        LENGTH(file_data->>'content') as content_length,
        LEFT(file_data->>'content', 100) as content_preview
      FROM git.repositories,
           jsonb_array_elements(data->'codebase'->'files') as file_data
      LIMIT 10;
    `;
    const sampleResult = await client.query(sampleQuery);
    
    sampleResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.file_path}`);
      console.log(`     Size: ${row.file_size} bytes, Content: ${row.content_length} chars`);
      console.log(`     Preview: "${row.content_preview?.replace(/\n/g, '\\n')}..."`);
    });

    // Check if repo_data table is ready
    console.log('\n🔍 Checking repo_data table...');
    const tableCheck = await client.query('SELECT COUNT(*) as count FROM repo_data');
    console.log(`📊 Current repo_data records: ${tableCheck.rows[0].count}`);

    // Prepare the migration
    console.log('\n🚀 Starting file migration...');
    
    const migrationQuery = `
      INSERT INTO repo_data (
        user_id, 
        repo_id, 
        file_path, 
        file_extension, 
        content, 
        content_vector,
        language
      )
      SELECT 
        r.user_id,
        r.repo_id,
        file_data->>'path' as file_path,
        CASE 
          WHEN file_data->>'path' LIKE '%.js' THEN 'js'
          WHEN file_data->>'path' LIKE '%.ts' THEN 'ts'
          WHEN file_data->>'path' LIKE '%.tsx' THEN 'tsx'
          WHEN file_data->>'path' LIKE '%.jsx' THEN 'jsx'
          WHEN file_data->>'path' LIKE '%.py' THEN 'py'
          WHEN file_data->>'path' LIKE '%.md' THEN 'md'
          WHEN file_data->>'path' LIKE '%.json' THEN 'json'
          WHEN file_data->>'path' LIKE '%.yml' OR file_data->>'path' LIKE '%.yaml' THEN 'yml'
          WHEN file_data->>'path' LIKE '%.html' THEN 'html'
          WHEN file_data->>'path' LIKE '%.css' THEN 'css'
          WHEN file_data->>'path' LIKE '%.sql' THEN 'sql'
          WHEN file_data->>'path' LIKE '%.sh' THEN 'sh'
          WHEN file_data->>'path' LIKE '%.env' THEN 'env'
          ELSE 'txt'
        END as file_extension,
        file_data->>'content' as content,
        to_tsvector('english', 
          COALESCE(file_data->>'path', '') || ' ' || 
          COALESCE(file_data->>'content', '')
        ) as content_vector,
        'english' as language
      FROM git.repositories r,
           jsonb_array_elements(r.data->'codebase'->'files') as file_data
      WHERE file_data->>'content' IS NOT NULL
      AND LENGTH(file_data->>'content') > 0
      AND LENGTH(file_data->>'content') < 1000000  -- Skip very large files (>1MB)
      ON CONFLICT (user_id, repo_id, file_path) DO UPDATE SET
        content = EXCLUDED.content,
        content_vector = EXCLUDED.content_vector,
        file_extension = EXCLUDED.file_extension,
        updated_at = CURRENT_TIMESTAMP;
    `;

    console.log('📝 Executing migration query...');
    const migrationResult = await client.query(migrationQuery);
    console.log(`✅ Migration completed: ${migrationResult.rowCount} files processed`);

    // Verify the migration
    console.log('\n🔍 Verifying migration results...');
    const verifyQuery = `
      SELECT 
        COUNT(*) as total_files,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT repo_id) as unique_repos,
        COUNT(DISTINCT file_extension) as unique_extensions,
        AVG(LENGTH(content)) as avg_content_length
      FROM repo_data;
    `;
    const verifyResult = await client.query(verifyQuery);
    const stats = verifyResult.rows[0];
    
    console.log('📊 Migration Statistics:');
    console.log(`  Total files: ${stats.total_files}`);
    console.log(`  Unique users: ${stats.unique_users}`);
    console.log(`  Unique repositories: ${stats.unique_repos}`);
    console.log(`  File types: ${stats.unique_extensions}`);
    console.log(`  Average content length: ${Math.round(stats.avg_content_length)} characters`);

    // Show file extension distribution
    console.log('\n📊 File type distribution:');
    const extensionQuery = `
      SELECT 
        file_extension,
        COUNT(*) as file_count,
        AVG(LENGTH(content)) as avg_size
      FROM repo_data
      GROUP BY file_extension
      ORDER BY file_count DESC;
    `;
    const extensionResult = await client.query(extensionQuery);
    extensionResult.rows.forEach(row => {
      console.log(`  .${row.file_extension}: ${row.file_count} files (avg: ${Math.round(row.avg_size)} chars)`);
    });

    // Test a sample search
    console.log('\n🔍 Testing full-text search on migrated data...');
    const testSearchQuery = `
      SELECT 
        file_path,
        file_extension,
        ts_rank(content_vector, to_tsquery('english', 'function | class | component')) AS rank,
        ts_headline('english', content, to_tsquery('english', 'function | class | component'), 'MaxWords=10') AS snippet
      FROM repo_data
      WHERE content_vector @@ to_tsquery('english', 'function | class | component')
      ORDER BY rank DESC
      LIMIT 5;
    `;
    
    const testResult = await client.query(testSearchQuery);
    if (testResult.rows.length > 0) {
      console.log('✅ Search test successful! Found relevant code files:');
      testResult.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.file_path} (.${row.file_extension}) - rank: ${parseFloat(row.rank).toFixed(3)}`);
        console.log(`     "${row.snippet}"`);
      });
    } else {
      console.log('⚠️  No results found in search test');
    }

    console.log('\n🎉 Repository files migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. ✅ repo_data table populated with searchable file content');
    console.log('2. 💡 Update TextSearchService to use repo_data table');
    console.log('3. 💡 Integrate PostgreSQL search with query RAG pipeline');
    console.log('4. 💡 Create hybrid search combining vector + text search');

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
migrateRepoFilesToSearch().catch(error => {
  console.error('❌ Migration execution failed:', {
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});