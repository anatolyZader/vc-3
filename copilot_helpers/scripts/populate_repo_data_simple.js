// Populate repo_data by calling the existing storeRepoChunks method
// This uses the same code path as the production indexing

require('dotenv').config({ path: './backend/.env' });
const AIPostgresAdapter = require('./backend/business_modules/ai/infrastructure/persistence/aiPostgresAdapter');

async function populateFromGitRepos() {
  console.log('🔄 Populating repo_data from git.repositories\n');

  const postgresAdapter = new AIPostgresAdapter({ cloudSqlConnector: null });
  const pool = await postgresAdapter.getPool();
  const client = await pool.connect();

  try {
    // Fetch repository data from git.repositories
    const result = await client.query(`
      SELECT 
        user_id,
        repo_id,
        data
      FROM git.repositories
      WHERE user_id = 'd41402df-182a-41ec-8f05-153118bf2718'
        AND repo_id = 'anatolyZader/vc-3'
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('⚠️  No repository found in git.repositories');
      return;
    }

    const repo = result.rows[0];
    console.log(`📦 Found repository: ${repo.repo_id}`);
    
    const files = repo.data?.codebase?.files || [];
    console.log(`📁 Total files: ${files.length}`);

    // Convert files to chunks format
    const chunks = [];
    for (const file of files) {
      if (!file.content || file.content.trim().length === 0) continue;
      if (file.content.length > 500000) continue; // Skip very large files

      chunks.push({
        pageContent: file.content,
        metadata: {
          source: file.path,
          filePath: file.path,
          type: 'github-code',
          branch: repo.data?.codebase?.branchName || 'main',
          sha: repo.data?.codebase?.commitHash || null,
          repository: repo.repo_id,
          chunkIndex: 0, // Storing full files as single chunks for now
          chunkTokens: Math.ceil(file.content.length / 4),
          processedAt: new Date().toISOString()
        }
      });
    }

    console.log(`\n💾 Storing ${chunks.length} file chunks to repo_data...`);

    // Use the production storeRepoChunks method
    const storeResult = await postgresAdapter.storeRepoChunks(
      chunks,
      repo.user_id,
      repo.repo_id,
      { includeMetadata: true }
    );

    console.log('\n✅ Migration complete!');
    console.log(`   Stored: ${storeResult.stored}`);
    console.log(`   Updated: ${storeResult.updated || 0}`);
    console.log(`   Skipped: ${storeResult.skipped}`);
    console.log(`   Total: ${storeResult.total}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
  }
}

populateFromGitRepos();
