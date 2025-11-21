// Add file_path to full-text search vector
// This makes filename searches work properly

require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

async function addFilePathToFTS() {
  console.log('🔧 Adding file_path to FTS index\n');

  const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: parseInt(process.env.PG_PORT) || 5432,
    ssl: false
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Step 1: Add separate FTS column (better than modifying content_vector)
    console.log('📝 Step 1: Adding fts column...');
    await client.query(`
      ALTER TABLE repo_data
      ADD COLUMN IF NOT EXISTS fts tsvector
    `);
    console.log('✅ Added fts column');

    // Step 2: Populate FTS with file_path (weight A) + chunk_content (weight B)
    console.log('\n📝 Step 2: Populating fts with file_path + content...');
    await client.query(`
      UPDATE repo_data
      SET fts = 
        setweight(to_tsvector('simple', COALESCE(file_path, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(chunk_content, '')), 'B')
      WHERE fts IS NULL OR fts = ''::tsvector
    `);
    console.log('✅ Populated fts column');

    // Step 3: Create trigger to keep fts updated
    console.log('\n📝 Step 3: Creating auto-update trigger...');
    
    // Drop old trigger if exists
    await client.query(`
      DROP TRIGGER IF EXISTS repo_data_fts_update_trigger ON repo_data
    `);

    // Create function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_repo_data_fts()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.fts := 
          setweight(to_tsvector('simple', COALESCE(NEW.file_path, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.chunk_content, '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // Create trigger
    await client.query(`
      CREATE TRIGGER repo_data_fts_update_trigger
      BEFORE INSERT OR UPDATE OF file_path, chunk_content
      ON repo_data
      FOR EACH ROW
      EXECUTE FUNCTION update_repo_data_fts()
    `);
    console.log('✅ Created trigger: repo_data_fts_update_trigger');

    // Step 4: Create GIN index for fast FTS
    console.log('\n📝 Step 4: Creating GIN index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS repo_data_fts_idx 
      ON repo_data USING GIN(fts)
    `);
    console.log('✅ Created index: repo_data_fts_idx');

    // Step 5: Create helper index for exact file_path lookups
    console.log('\n📝 Step 5: Creating file_path index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS repo_data_file_path_idx 
      ON repo_data (user_id, repo_id, file_path, chunk_index)
    `);
    console.log('✅ Created index: repo_data_file_path_idx');

    await client.query('COMMIT');

    // Verify
    console.log('\n🔍 Verifying FTS setup...');
    const testResult = await client.query(`
      SELECT file_path, chunk_index
      FROM repo_data
      WHERE user_id = 'd41402df-182a-41ec-8f05-153118bf2718'
        AND repo_id = 'anatolyZader/vc-3'
        AND fts @@ to_tsquery('simple', 'aiLangchainAdapter')
      ORDER BY chunk_index
      LIMIT 5
    `);

    if (testResult.rows.length > 0) {
      console.log(`✅ FTS test successful! Found ${testResult.rows.length} chunks:`);
      testResult.rows.forEach(r => {
        console.log(`   - ${r.file_path} [chunk ${r.chunk_index}]`);
      });
    } else {
      console.log('⚠️  FTS test returned 0 results (may need re-indexing)');
    }

    console.log('\n🎉 Migration complete!');
    console.log('\n📋 Summary:');
    console.log('  ✅ Added fts tsvector column');
    console.log('  ✅ Weighted file_path higher (A) than content (B)');
    console.log('  ✅ Created auto-update trigger');
    console.log('  ✅ Created GIN index for fast search');
    console.log('  ✅ Created file_path index for direct lookups');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addFilePathToFTS().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
