// Check repo_data table content
require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

async function checkRepoData() {
  const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: parseInt(process.env.PG_PORT) || 5432,
    ssl: false
  });

  try {
    console.log('🔍 Checking repo_data table content\n');

    // Check total records
    const total = await pool.query(`
      SELECT COUNT(*) as total
      FROM repo_data 
      WHERE user_id = 'd41402df-182a-41ec-8f05-153118bf2718'
        AND repo_id = 'anatolyZader/vc-3'
    `);
    console.log('📊 Total records in repo_data:', total.rows[0].total);

    if (parseInt(total.rows[0].total) > 0) {
      // Sample some records
      const sample = await pool.query(`
        SELECT file_path, file_extension, LENGTH(chunk_content) as size
        FROM repo_data 
        WHERE user_id = 'd41402df-182a-41ec-8f05-153118bf2718'
          AND repo_id = 'anatolyZader/vc-3'
        ORDER BY created_at DESC
        LIMIT 10
      `);
      console.log('\n📋 Sample records:');
      sample.rows.forEach(r => console.log(`  - ${r.file_path} (.${r.file_extension}) - ${r.size} bytes`));

      // Check for aiLangchainAdapter
      const adapter = await pool.query(`
        SELECT file_path, LENGTH(chunk_content) as size
        FROM repo_data 
        WHERE user_id = 'd41402df-182a-41ec-8f05-153118bf2718'
          AND repo_id = 'anatolyZader/vc-3'
          AND file_path ILIKE '%aiLangchain%'
      `);
      console.log('\n🔍 aiLangchainAdapter files:', adapter.rows.length);
      adapter.rows.forEach(r => console.log(`  - ${r.file_path} - ${r.size} bytes`));
    } else {
      console.log('\n⚠️  repo_data table is EMPTY!');
      console.log('This explains why full-text search returns 0 results.');
      console.log('\nThe table was created but never populated with data.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkRepoData();
