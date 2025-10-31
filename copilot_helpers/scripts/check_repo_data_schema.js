// Check repo_data table schema
require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

async function checkSchema() {
  const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: parseInt(process.env.PG_PORT) || 5432,
    ssl: false
  });

  try {
    console.log('🔍 Checking repo_data table schema\n');

    const result = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'repo_data'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Columns in repo_data:');
    result.rows.forEach(r => {
      console.log(`  - ${r.column_name} (${r.data_type}) ${r.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${r.column_default ? `DEFAULT ${r.column_default}` : ''}`);
    });
    console.log(`\n✅ Total columns: ${result.rows.length}`);

    // Check for required chunking columns
    const requiredColumns = ['chunk_index', 'chunk_content', 'chunk_tokens', 'metadata'];
    const existingColumns = result.rows.map(r => r.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length > 0) {
      console.log('\n⚠️  MISSING CHUNKING COLUMNS:');
      missingColumns.forEach(col => console.log(`  ❌ ${col}`));
      console.log('\n💡 You need to run the chunking migration:');
      console.log('   node backend/migrate_add_chunking_support.js');
    } else {
      console.log('\n✅ All required chunking columns exist!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkSchema();
