// Check FTS table for aiLangchainAdapter.js
require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

async function checkFTS() {
  const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: parseInt(process.env.PG_PORT) || 5432,
    ssl: false
  });

  try {
    console.log('🔍 Checking FTS table for aiLangchainAdapter.js\n');

    // Check for aiLangchainAdapter files
    const result = await pool.query(`
      SELECT 
        file_path,
        file_name,
        LENGTH(content) as content_length,
        created_at
      FROM repo_files_fts 
      WHERE user_id = 'd41402df-182a-41ec-8f05-153118bf2718'
        AND repo_id = 'anatolyZader/vc-3'
        AND file_name ILIKE '%aiLangchain%'
      ORDER BY created_at DESC
    `);
    
    console.log('📄 FTS Records for aiLangchainAdapter:');
    console.log(JSON.stringify(result.rows, null, 2));
    console.log('\n✅ Total matches:', result.rows.length);
    
    // Check total FTS records
    const total = await pool.query(`
      SELECT COUNT(*) as total
      FROM repo_files_fts 
      WHERE user_id = 'd41402df-182a-41ec-8f05-153118bf2718'
        AND repo_id = 'anatolyZader/vc-3'
    `);
    console.log('\n📊 Total FTS records for this repo:', total.rows[0].total);

    // Sample some records to see what's there
    const sample = await pool.query(`
      SELECT file_path, file_name
      FROM repo_files_fts 
      WHERE user_id = 'd41402df-182a-41ec-8f05-153118bf2718'
        AND repo_id = 'anatolyZader/vc-3'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.log('\n📋 Sample FTS records:');
    sample.rows.forEach(r => console.log(`  - ${r.file_path}`));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkFTS();
