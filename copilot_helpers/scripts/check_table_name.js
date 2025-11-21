// check_table_name.js
const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

async function checkTableNames() {
  const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT || 5432,
  });
  
  try {
    console.log('🔍 Checking which table actually exists...\n');
    
    // Check both possible table names
    const checkQuery = `
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
        AND table_name IN ('repo_data', 'repo_files_search')
      ORDER BY table_name
    `;
    
    const result = await pool.query(checkQuery);
    
    if (result.rows.length === 0) {
      console.log('❌ NEITHER table exists!');
      console.log('\n📋 Existing tables in public schema:');
      const allTables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      allTables.rows.forEach(row => console.log(`   - ${row.table_name}`));
    } else {
      console.log('✅ Found table(s):');
      result.rows.forEach(row => {
        console.log(`   - ${row.table_name} (${row.column_count} columns)`);
      });
      
      // Check row counts
      for (const row of result.rows) {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${row.table_name}`);
        console.log(`     └─ ${countResult.rows[0].count} rows`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTableNames();
