#!/usr/bin/env node

// Test the cloud-native backend loading fixes
require('dotenv').config();

const CloudNativeRepoLoader = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/cloudNativeRepoLoader');

async function testCloudNativeLoader() {
  console.log('🌐 TESTING: Cloud-Native Backend Loader');
  console.log('=' .repeat(50));
  
  try {
    // Test the cloud-native loader directly
    const cloudLoader = new CloudNativeRepoLoader({
      owner: 'anatolyZader',
      repo: 'vc-3',
      branch: 'main',
      focusPath: 'backend/',
      maxFiles: 50,
      timeout: 30000
    });
    
    console.log('🚀 Testing cloud-native backend file loading...');
    const backendFiles = await cloudLoader.load();
    
    console.log(`\n📊 RESULTS:`);
    console.log(`Backend files loaded: ${backendFiles.length}`);
    
    if (backendFiles.length > 0) {
      console.log(`✅ SUCCESS! Cloud-native loader successfully retrieved backend files`);
      console.log(`\n🔍 Sample backend files found:`);
      
      // Group by subdirectory for better overview
      const dirGroups = {};
      backendFiles.forEach(doc => {
        const parts = doc.metadata.source.split('/');
        const dir = parts.slice(0, 3).join('/'); // e.g., backend/business_modules/ai
        if (!dirGroups[dir]) dirGroups[dir] = [];
        dirGroups[dir].push(doc);
      });
      
      Object.entries(dirGroups).forEach(([dir, files]) => {
        console.log(`\n📂 ${dir}/ (${files.length} files):`);
        files.slice(0, 3).forEach(file => {
          const filename = file.metadata.source.split('/').pop();
          const preview = file.pageContent.substring(0, 60).replace(/\n/g, ' ');
          console.log(`  - ${filename} (${file.pageContent.length} chars)`);
          console.log(`    "${preview}..."`);
        });
        if (files.length > 3) {
          console.log(`    ... and ${files.length - 3} more files`);
        }
      });
      
      // Test loading quality
      const jsFiles = backendFiles.filter(f => f.metadata.source.endsWith('.js'));
      const configFiles = backendFiles.filter(f => f.metadata.source.endsWith('.json'));
      const mdFiles = backendFiles.filter(f => f.metadata.source.endsWith('.md'));
      
      console.log(`\n📈 FILE TYPE BREAKDOWN:`);
      console.log(`  JavaScript: ${jsFiles.length}`);
      console.log(`  Config/JSON: ${configFiles.length}`);
      console.log(`  Documentation: ${mdFiles.length}`);
      console.log(`  Other: ${backendFiles.length - jsFiles.length - configFiles.length - mdFiles.length}`);
      
    } else {
      console.log(`❌ Failed: Still getting 0 backend files`);
      console.log(`This could indicate:`);
      console.log(`  1. Repository is private and requires authentication`);
      console.log(`  2. No backend/ directory exists in the repository`);
      console.log(`  3. GitHub API rate limiting`);
      console.log(`  4. Network connectivity issues`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

async function testRepoStructure() {
  console.log('\n🔍 TESTING: Repository Structure Analysis');
  console.log('=' .repeat(50));
  
  try {
    // Test basic repo structure
    const response = await fetch('https://api.github.com/repos/anatolyZader/vc-3/git/trees/main?recursive=1', {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'eventstorm-test'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const tree = data.tree || [];
      
      console.log(`📂 Total repository items: ${tree.length}`);
      
      // Analyze directory structure
      const directories = new Set();
      const backendFiles = [];
      
      tree.forEach(item => {
        if (item.type === 'tree') {
          directories.add(item.path);
        } else if (item.path.startsWith('backend/')) {
          backendFiles.push(item.path);
        }
      });
      
      console.log(`📁 Top-level directories: ${Array.from(directories).filter(d => !d.includes('/')).join(', ')}`);
      console.log(`🏗️ Backend files available: ${backendFiles.length}`);
      
      if (backendFiles.length > 0) {
        console.log(`✅ Repository HAS backend files - loader should work`);
        console.log(`Sample backend files:`);
        backendFiles.slice(0, 10).forEach(path => {
          console.log(`  - ${path}`);
        });
      } else {
        console.log(`❌ Repository has NO backend files - this explains the 0 count`);
      }
      
    } else {
      console.log(`❌ Failed to analyze repository structure: ${response.status} ${response.statusText}`);
    }
    
  } catch (error) {
    console.error('❌ Repository analysis failed:', error.message);
  }
}

if (require.main === module) {
  (async () => {
    await testRepoStructure();
    await testCloudNativeLoader();
  })();
}

module.exports = { testCloudNativeLoader, testRepoStructure };