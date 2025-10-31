const { Pool } = require('pg');

async function checkData() {
  const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    database: process.env.DB_NAME || 'eventstorm_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
  });

  try {
    // Check repo_files_search table
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(CASE WHEN file_path LIKE '%aiService.js%' THEN 1 END) as aiservice_files,
        COUNT(CASE WHEN file_path LIKE '%app.js%' THEN 1 END) as app_files
      FROM repo_files_search
    `);
    
    console.log('📊 repo_files_search table stats:');
    console.log(result.rows[0]);
    
    // Check for specific user
    const userResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM repo_files_search
      WHERE user_id = $1
    `, ['d41402df-182a-41ec-8f05-153118bf2718']);
    
    console.log('\n📊 Data for user d41402df-182a-41ec-8f05-153118bf2718:', userResult.rows[0].count);
    
    // Sample some file paths
    const sampleResult = await pool.query(`
      SELECT file_path, user_id
      FROM repo_files_search
      LIMIT 10
    `);
    
    console.log('\n📄 Sample file paths:');
    sampleResult.rows.forEach(row => {
      console.log(`  - ${row.file_path} (user: ${row.user_id})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkData();
