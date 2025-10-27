/**
 * Migration Script: Update existing Pinecone vectors with new file type classifications
 * 
 * This script helps migrate from generic 'github-file' type to specific types:
 * - github-code: Implementation code
 * - github-docs: Documentation files
 * - github-test: Test files
 * - github-config: Configuration files
 * - github-catalog: Data catalogs
 * 
 * Usage:
 *   node migrate_file_types.js
 * 
 * Note: This is a helper script. The best way to update file types is to
 * re-process your repositories through the normal pipeline, which will
 * automatically apply the new classifications.
 */

require('dotenv').config();

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║          File Type Migration Information                       ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

Your codebase has been updated to use specific file type classifications
instead of the generic 'github-file' type.

New File Types:
  🔹 github-code      - Actual implementation code (JS, TS, Python, etc.)
  🔹 github-docs      - Documentation files (README.md, *.md)
  🔹 github-test      - Test files (*.test.js, *.spec.ts)
  🔹 github-config    - Configuration files (package.json, .env)
  🔹 github-catalog   - Data catalogs (JSON schemas, dictionaries)

Benefits:
  ✅ Better search relevance (catalogs excluded by default)
  ✅ Smarter query strategies (tests prioritized for test questions)
  ✅ Improved filtering (configs only shown when relevant)
  ✅ More accurate result caps per file type

How to Apply:
  The new file type classification will be applied automatically when:
  
  1. You push a new repository (processPushedRepo)
  2. You re-process an existing repository
  
  For existing data in Pinecone, you have two options:
  
  Option A (Recommended): Re-process your repositories
    - Simply push your repository again through the normal flow
    - The contextPipeline will automatically apply new classifications
    - This ensures all metadata is fresh and correct
  
  Option B: Continue using legacy data
    - Your existing 'github-file' vectors will still work
    - They'll be treated with default 10-chunk cap
    - Gradually migrate by re-processing repos as needed

Current Status:
  ✅ Code updated to use new file type classifications
  ✅ Search strategies updated to prioritize file types
  ✅ Catalog filtering improved (type-based + content-based)
  ✅ Deduplication caps configured per file type
  
  ⏳ Existing Pinecone vectors still use 'github-file' type
  ⏳ Re-process repositories to apply new classifications

Next Steps:
  1. Test the new classifications on a sample query
  2. Monitor logs for file type distribution
  3. Re-process repositories when convenient
  
  For immediate testing:
    - New repositories will use the new types automatically
    - Legacy repositories will work but show as 'githubLegacy' in logs

╔════════════════════════════════════════════════════════════════╗
║  No action required - system will migrate naturally over time  ║
╚════════════════════════════════════════════════════════════════╝
`);

// Check if user wants to see statistics about current Pinecone data
if (process.argv.includes('--stats')) {
  checkPineconeStats().catch(console.error);
}

async function checkPineconeStats() {
  const { Pinecone } = require('@pinecone-database/pinecone');
  
  console.log('\n📊 Checking Pinecone index statistics...\n');
  
  try {
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const indexName = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
    const index = pinecone.index(indexName);
    
    const stats = await index.describeIndexStats();
    
    console.log(`Index: ${indexName}`);
    console.log(`Total vectors: ${stats.totalRecordCount || 'N/A'}`);
    console.log(`Dimension: ${stats.dimension || 'N/A'}`);
    console.log('\nNamespaces:');
    
    if (stats.namespaces) {
      for (const [namespace, info] of Object.entries(stats.namespaces)) {
        console.log(`  📦 ${namespace}: ${info.recordCount || 0} vectors`);
      }
    }
    
    console.log('\n💡 Note: To see file type breakdown, you would need to query and inspect metadata.');
    console.log('   Re-processing repositories is the cleanest way to migrate to new types.');
    
  } catch (error) {
    console.error('❌ Error checking stats:', error.message);
    console.log('\nMake sure you have PINECONE_API_KEY and PINECONE_INDEX_NAME set in .env');
  }
}

// Export for use as module
module.exports = {
  checkPineconeStats
};
