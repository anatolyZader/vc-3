#!/usr/bin/env node

// Test the specialized backend loader
require('dotenv').config();

const RepoProcessor = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/repoProcessor');

async function testSpecializedBackendLoader() {
  console.log('🏗️ TESTING: Specialized Backend Loader');
  console.log('=' .repeat(50));
  
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.error('❌ No GitHub token found');
    return;
  }

  const repoProcessor = new RepoProcessor();
  
  try {
    const repoUrl = 'https://github.com/anatolyZader/vc-3';
    const branch = 'main';
    
    console.log('🚀 Testing specialized backend loader...');
    const backendFiles = await repoProcessor.loadBackendDirectoryFiles(repoUrl, branch);
    
    console.log(`\n📊 RESULTS:`);
    console.log(`Backend files loaded: ${backendFiles.length}`);
    
    if (backendFiles.length > 0) {
      console.log(`✅ SUCCESS! Specialized backend loader is working`);
      console.log(`\n🔍 Backend files found:`);
      
      // Group by directory for better overview
      const dirGroups = {};
      backendFiles.forEach(doc => {
        const parts = doc.metadata.source.split('/');
        const dir = parts.slice(0, 3).join('/'); // e.g., backend/business_modules/ai
        if (!dirGroups[dir]) dirGroups[dir] = [];
        dirGroups[dir].push(doc);
      });
      
      Object.entries(dirGroups).forEach(([dir, files]) => {
        console.log(`\n📂 ${dir}/ (${files.length} files):`);
        files.slice(0, 5).forEach(file => {
          const preview = file.pageContent.substring(0, 60).replace(/\n/g, ' ');
          console.log(`  - ${file.metadata.source.split('/').pop()} (${file.pageContent.length} chars)`);
          console.log(`    "${preview}..."`);
        });
        if (files.length > 5) {
          console.log(`    ... and ${files.length - 5} more files`);
        }
      });
      
    } else {
      console.log(`❌ Still getting 0 backend files - need further debugging`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  testSpecializedBackendLoader();
}

module.exports = { testSpecializedBackendLoader };