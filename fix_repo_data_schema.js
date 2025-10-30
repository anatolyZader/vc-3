// Fix repo_data schema: make content column nullable
require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

async function fixSchema() {
  const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: parseInt(process.env.PG_PORT) || 5432,
    ssl: false
  });

  try {
    console.log('🔧 Fixing repo_data schema\n');

    const client = await pool.connect();
    
    try {
      // Make content column nullable since we're using chunk_content now
      await client.query(`
        ALTER TABLE repo_data 
        ALTER COLUMN content DROP NOT NULL
      `);
      console.log('✅ Made content column nullable');
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixSchema();
