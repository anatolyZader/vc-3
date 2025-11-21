/**
 * Simplified Full-Text Search Test
 * Tests PostgreSQL full-text search directly
 */

try {
  require('dotenv').config();
} catch (e) {
  console.log('⚠️  dotenv not available');
}

const AIPostgresAdapter = require('./backend/business_modules/ai/infrastructure/persistence/aiPostgresAdapter');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║   Simplified Full-Text Search Test                            ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

async function testDirectFullTextSearch() {
  // Use AIPostgresAdapter which handles Cloud SQL proxy connections
  const postgresAdapter = new AIPostgresAdapter({ cloudSqlConnector: null });
  await postgresAdapter.initPool();
  const pool = await postgresAdapter.getPool();

  try {
    console.log('🔍 Step 1: Check PostgreSQL Connection\n');
    const versionResult = await pool.query('SELECT version()');
    console.log('✅ PostgreSQL Connected:', versionResult.rows[0].version.split(',')[0]);
    console.log('');

    console.log('🔍 Step 2: Check if data exists in PostgreSQL\n');
    const countResult = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN file_path LIKE '%app.js%' THEN 1 END) as app_js_files,
             COUNT(CASE WHEN file_path LIKE '%aiLangchainAdapter.js%' THEN 1 END) as ai_adapter_files
      FROM repo_files_search
    `);
    
    const stats = countResult.rows[0];
    console.log('📊 Data Statistics:');
    console.log(`   Total documents: ${stats.total}`);
    console.log(`   Files with "app.js": ${stats.app_js_files}`);
    console.log(`   Files with "aiLangchainAdapter.js": ${stats.ai_adapter_files}`);
    console.log('');

    if (parseInt(stats.total) === 0) {
      console.log('⚠️  No data found in repo_files_search table!');
      console.log('   You may need to run the ingestion pipeline first.');
      return;
    }

    console.log('🔍 Step 3: Test full-text search for "app.js"\n');
    const appJsSearch = await pool.query(`
      SELECT file_path, 
             LEFT(content, 200) as content_preview,
             ts_rank(content_vector, to_tsquery('english', 'app')) as rank
      FROM repo_files_search
      WHERE file_path LIKE '%app.js%'
      ORDER BY rank DESC
      LIMIT 5
    `);
    
    if (appJsSearch.rows.length > 0) {
      console.log(`✅ Found ${appJsSearch.rows.length} matches for "app.js":`);
      appJsSearch.rows.forEach((row, i) => {
        console.log(`\n   ${i + 1}. File: ${row.file_path}`);
        console.log(`      Rank: ${parseFloat(row.rank).toFixed(4)}`);
        console.log(`      Preview: ${row.content_preview.substring(0, 80)}...`);
      });
    } else {
      console.log('❌ No matches found for "app.js"');
    }
    console.log('');

    console.log('🔍 Step 4: Test full-text search for "aiLangchainAdapter.js"\n');
    const adapterSearch = await pool.query(`
      SELECT file_path, 
             LEFT(content, 200) as content_preview,
             ts_rank(content_vector, to_tsquery('english', 'aiLangchainAdapter')) as rank
      FROM repo_files_search
      WHERE file_path LIKE '%aiLangchainAdapter.js%'
      ORDER BY rank DESC
      LIMIT 5
    `);
    
    if (adapterSearch.rows.length > 0) {
      console.log(`✅ Found ${adapterSearch.rows.length} matches for "aiLangchainAdapter.js":`);
      adapterSearch.rows.forEach((row, i) => {
        console.log(`\n   ${i + 1}. File: ${row.file_path}`);
        console.log(`      Rank: ${parseFloat(row.rank).toFixed(4)}`);
        console.log(`      Preview: ${row.content_preview.substring(0, 80)}...`);
      });
    } else {
      console.log('❌ No matches found for "aiLangchainAdapter.js"');
    }
    console.log('');

    console.log('🔍 Step 5: Test combined full-text search with ts_query\n');
    const combinedSearch = await pool.query(`
      SELECT file_path,
             ts_rank(content_vector, query) as rank
      FROM repo_files_search,
           to_tsquery('english', 'app | adapter') as query
      WHERE content_vector @@ query
         OR file_path LIKE '%app.js%'
         OR file_path LIKE '%adapter%'
      ORDER BY rank DESC
      LIMIT 10
    `);
    
    if (combinedSearch.rows.length > 0) {
      console.log(`✅ Found ${combinedSearch.rows.length} matches with combined search:`);
      combinedSearch.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.file_path} (rank: ${parseFloat(row.rank).toFixed(4)})`);
      });
    } else {
      console.log('❌ No matches found with combined search');
    }
    console.log('');

    console.log('✅ Full-Text Search Test Complete!\n');
    console.log('📝 Summary:');
    console.log(`   - PostgreSQL connection: Working`);
    console.log(`   - Data available: ${stats.total} documents`);
    console.log(`   - File path search: ${appJsSearch.rows.length + adapterSearch.rows.length} results`);
    console.log(`   - Combined ts_query search: ${combinedSearch.rows.length} results`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await postgresAdapter.closePool();
  }
}

// Run the test
testDirectFullTextSearch().catch(console.error);
