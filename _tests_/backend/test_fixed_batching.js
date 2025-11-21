#!/usr/bin/env node

// Test the FIXED repository processing to see if we get more documents
const RepoProcessor = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/repoProcessor');

async function testFixedBatching() {
  console.log('🔧 TESTING FIXED BATCH CONFIGURATION');
  console.log('🎯 Goal: Process MORE than just 7 documents from the repository');
  console.log('=' .repeat(60));
  
  require('dotenv').config();
  const githubToken = process.env.GITHUB_TOKEN;
  
  if (!githubToken) {
    console.error('❌ No GitHub token found');
    return;
  }

  try {
    // Create processor with basic config
    const processor = new RepoProcessor({
      repositoryManager: {
        sanitizeId: (id) => id.replace(/[^a-zA-Z0-9_-]/g, '_'),
        getFileType: (filename) => {
          if (!filename) return 'unknown';
          const ext = filename.split('.').pop();
          return ext || 'unknown';
        }
      }
    });
    
    const repoUrl = 'https://github.com/anatolyZader/vc-3';
    const branch = 'main';
    const { githubOwner, repoName } = processor.parseRepoUrl(repoUrl);
    
    console.log(`📂 Repository: ${githubOwner}/${repoName}`);
    console.log(`🌿 Branch: ${branch}`);
    
    // Get commit info
    const commitInfo = await processor.getCommitInfoFromGitHubAPI(githubOwner, repoName, branch);
    console.log(`📝 Latest commit: ${commitInfo?.hash?.substring(0, 8) || 'unknown'} by ${commitInfo?.author || 'unknown'}`);
    
    // Test the updated batch processing
    console.log('\n🔄 Testing updated batch processing...');
    const startTime = Date.now();
    const documents = await processor.loadDocumentsWithLangchain(repoUrl, branch, githubOwner, repoName, commitInfo);
    const endTime = Date.now();
    
    console.log('\n📊 RESULTS:');
    console.log(`⏱️  Processing time: ${endTime - startTime}ms`);
    console.log(`📄 Total documents loaded: ${documents.length}`);
    
    // Analyze what we got
    const batchBreakdown = {};
    const fileTypeBreakdown = {};
    const directoryBreakdown = {};
    
    documents.forEach(doc => {
      const batch = doc.metadata.batch_name || 'unknown';
      const fileType = doc.metadata.file_type || 'unknown';
      const source = doc.metadata.source || 'unknown';
      const directory = source.includes('/') ? source.split('/')[0] : 'root';
      
      batchBreakdown[batch] = (batchBreakdown[batch] || 0) + 1;
      fileTypeBreakdown[fileType] = (fileTypeBreakdown[fileType] || 0) + 1;
      directoryBreakdown[directory] = (directoryBreakdown[directory] || 0) + 1;
    });
    
    console.log('\n📊 Breakdown by batch:');
    for (const [batch, count] of Object.entries(batchBreakdown)) {
      console.log(`  🔹 ${batch}: ${count} documents`);
    }
    
    console.log('\n📊 Breakdown by file type:');
    for (const [type, count] of Object.entries(fileTypeBreakdown)) {
      console.log(`  📄 .${type}: ${count} files`);
    }
    
    console.log('\n📊 Breakdown by directory:');
    for (const [dir, count] of Object.entries(directoryBreakdown)) {
      console.log(`  📂 ${dir}/: ${count} files`);
    }
    
    // Show some sample documents
    console.log('\n📋 Sample documents loaded:');
    documents.slice(0, 10).forEach((doc, index) => {
      const preview = doc.pageContent.substring(0, 60).replace(/\n/g, ' ');
      console.log(`  ${index + 1}. ${doc.metadata.source} (${doc.pageContent.length} chars)`);
      console.log(`     Batch: ${doc.metadata.batch_name || 'unknown'}`);
      console.log(`     Preview: "${preview}..."`);
      console.log('');
    });
    
    if (documents.length > 10) {
      console.log(`  ... and ${documents.length - 10} more documents`);
    }
    
    // Compare with old results
    console.log('\n🔍 COMPARISON WITH PREVIOUS RESULTS:');
    if (documents.length > 7) {
      console.log(`✅ SUCCESS! We now have ${documents.length} documents instead of just 7!`);
      console.log(`📈 That's ${documents.length - 7} more documents processed!`);
      
      // Check if we're getting backend files
      const backendFiles = documents.filter(doc => doc.metadata.source?.startsWith('backend/'));
      console.log(`🏗️  Backend files: ${backendFiles.length}`);
      
      if (backendFiles.length > 0) {
        console.log('🎉 We\'re now successfully processing backend files!');
        console.log('   Sample backend files:');
        backendFiles.slice(0, 5).forEach(doc => {
          console.log(`   - ${doc.metadata.source}`);
        });
      }
      
    } else if (documents.length === 7) {
      console.log('⚠️  Still getting 7 documents. The batch configuration might need further adjustment.');
    } else {
      console.log(`📉 Got ${documents.length} documents (less than before). Something might be wrong.`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

if (require.main === module) {
  testFixedBatching();
}

module.exports = { testFixedBatching };