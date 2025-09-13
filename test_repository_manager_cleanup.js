// test_repository_manager_cleanup.js
// Quick test to verify the updated cleanupTempDir method works correctly

const RepositoryManager = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/processors/repositoryManager');
const fs = require('fs').promises;
const path = require('path');

async function testCleanupTempDir() {
  console.log('🧪 Testing RepositoryManager.cleanupTempDir with updated fs.rm API');
  
  const repoManager = new RepositoryManager();
  
  // Create a temporary test directory
  const testTempDir = path.join(__dirname, 'test_temp_cleanup');
  
  try {
    // Create test directory with some test files
    await fs.mkdir(testTempDir, { recursive: true });
    await fs.writeFile(path.join(testTempDir, 'test_file.txt'), 'test content');
    await fs.mkdir(path.join(testTempDir, 'subdir'), { recursive: true });
    await fs.writeFile(path.join(testTempDir, 'subdir', 'nested_file.txt'), 'nested content');
    
    console.log('✅ Created test directory structure');
    
    // Verify directory exists before cleanup
    const statsBefore = await fs.stat(testTempDir);
    console.log('✅ Test directory exists before cleanup');
    
    // Test the cleanup method with the new fs.rm API
    await repoManager.cleanupTempDir(testTempDir);
    
    // Verify directory is removed
    try {
      await fs.stat(testTempDir);
      console.log('❌ Directory still exists after cleanup - test failed');
      return false;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('✅ Directory successfully removed - fs.rm works correctly');
        return true;
      } else {
        console.log('❌ Unexpected error:', error.message);
        return false;
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Cleanup in case of failure
    try {
      await fs.rm(testTempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.log('⚠️ Manual cleanup needed for:', testTempDir);
    }
    
    return false;
  }
}

// Run the test
testCleanupTempDir().then(success => {
  if (success) {
    console.log('🎉 RepositoryManager.cleanupTempDir test passed! Deprecated fs.rmdir replaced with fs.rm successfully.');
  } else {
    console.log('❌ Test failed - there may be issues with the fs.rm replacement.');
  }
  process.exit(success ? 0 : 1);
});
