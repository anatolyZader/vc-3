// Check what tables exist
require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

async function checkTables() {
  const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: parseInt(process.env.PG_PORT) || 5432,
    ssl: false
  });

  try {
    console.log('🔍 Checking database tables\n');

    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 Tables in database:');
    result.rows.forEach(r => console.log(`  - ${r.table_name}`));
    console.log(`\n✅ Total tables: ${result.rows.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkTables();
