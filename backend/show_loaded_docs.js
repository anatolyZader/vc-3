#!/usr/bin/env node

// Show exactly what documents are being loaded
const { GithubRepoLoader } = require('@langchain/community/document_loaders/web/github');

async function showLoadedDocuments() {
  console.log('📋 DOCUMENT VISIBILITY REPORT');
  console.log('=' .repeat(50));
  
  require('dotenv').config();
  const githubToken = process.env.GITHUB_TOKEN;
  
  if (!githubToken) {
    console.error('❌ No GitHub token found');
    return;
  }

  const repoUrl = 'https://github.com/anatolyZader/vc-3';
  
  console.log('\n🔍 CURRENT BATCH PROCESSING RESULTS:');
  console.log('This shows exactly what your current configuration loads\n');

  // Replicate the exact batches from your code
  const batches = [
    {
      name: 'Core Documentation',
      recursive: false,
      priority: 1,
      maxConcurrency: 2,
      ignoreFiles: [
        'node_modules/**', '.git/**', 'dist/**', 'build/**', 'coverage/**', 'temp/**',
        '*.log', '*.lock', '*.tmp', '.DS_Store', '**/.DS_Store', '*.min.js', '*.min.css',
        'backend/**', 'client/**', 'tools/**' // This excludes a lot!
      ]
    },
    {
      name: 'Backend JavaScript/TypeScript',
      recursive: true, // But will timeout and fallback to false
      priority: 2,
      maxConcurrency: 2,
      fileTypeFilter: ['js', 'ts', 'jsx', 'tsx'],
      ignoreFiles: [
        'node_modules/**', '.git/**', 'dist/**', 'build/**', 'coverage/**', 'temp/**',
        '*.log', '*.lock', '*.tmp', '.DS_Store', '**/.DS_Store', '*.min.js', '*.min.css',
        'client/**', 'tools/**',
        '**/*.test.js', '**/*.spec.js', '**/*.test.ts', '**/*.spec.ts'
      ]
    },
    {
      name: 'Backend Configuration & Docs',
      recursive: true, // But will timeout and fallback to false
      priority: 3,
      maxConcurrency: 2,
      fileTypeFilter: ['md', 'json', 'yml', 'yaml'],
      ignoreFiles: [
        'node_modules/**', '.git/**', 'dist/**', 'build/**', 'coverage/**', 'temp/**',
        '*.log', '*.lock', '*.tmp', '.DS_Store', '**/.DS_Store', '*.min.js', '*.min.css',
        'client/**', 'tools/**',
        'package-lock.json', 'yarn.lock'
      ]
    }
  ];

  let totalDocuments = [];
  
  for (const [index, batch] of batches.entries()) {
    console.log(`\n📦 BATCH ${index + 1}: ${batch.name}`);
    console.log(`   📝 Config: recursive=${batch.recursive}, maxConcurrency=${batch.maxConcurrency}`);
    if (batch.fileTypeFilter) {
      console.log(`   📁 File types: ${batch.fileTypeFilter.join(', ')}`);
    }
    
    try {
      const loader = new GithubRepoLoader(repoUrl, {
        branch: 'main',
        recursive: batch.recursive,
        maxConcurrency: batch.maxConcurrency,
        accessToken: githubToken,
        ignorePaths: batch.ignoreFiles
      });
      
      const documents = await loader.load();
      
      // Apply file type filtering if specified
      let filteredDocs = documents;
      if (batch.fileTypeFilter && batch.fileTypeFilter.length > 0) {
        filteredDocs = documents.filter(doc => {
          if (!doc.metadata.source) return false;
          const fileExtension = doc.metadata.source.includes('.') ? 
            doc.metadata.source.split('.').pop().toLowerCase() : '';
          return batch.fileTypeFilter.includes(fileExtension);
        });
      }
      
      console.log(`   📊 Raw loaded: ${documents.length} files`);
      console.log(`   📊 After filtering: ${filteredDocs.length} files`);
      
      if (filteredDocs.length > 0) {
        console.log('   📄 Documents in this batch:');
        filteredDocs.forEach((doc, i) => {
          const size = doc.pageContent.length;
          const preview = doc.pageContent.substring(0, 60).replace(/\n/g, ' ').trim();
          console.log(`      ${i + 1}. ${doc.metadata.source} (${size} chars)`);
          console.log(`         Preview: "${preview}${size > 60 ? '...' : ''}"`);
        });
        
        // Add to total with batch metadata
        const batchDocs = filteredDocs.map(doc => ({
          ...doc,
          metadata: {
            ...doc.metadata,
            batch_name: batch.name,
            batch_priority: batch.priority
          }
        }));
        totalDocuments.push(...batchDocs);
      } else {
        console.log('   ⚠️  No documents found in this batch');
      }
      
    } catch (error) {
      console.error(`   ❌ Batch failed: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 TOTAL DOCUMENTS LOADED: ${totalDocuments.length}`);
  console.log('='.repeat(50));
  
  if (totalDocuments.length > 0) {
    console.log('\n📄 ALL DOCUMENTS SUMMARY:');
    totalDocuments.forEach((doc, i) => {
      console.log(`${i + 1}. ${doc.metadata.source} (${doc.pageContent.length} chars) [${doc.metadata.batch_name}]`);
    });
    
    console.log('\n📊 BREAKDOWN BY BATCH:');
    const batchCounts = {};
    totalDocuments.forEach(doc => {
      const batchName = doc.metadata.batch_name || 'unknown';
      batchCounts[batchName] = (batchCounts[batchName] || 0) + 1;
    });
    
    for (const [batch, count] of Object.entries(batchCounts)) {
      console.log(`   - ${batch}: ${count} documents`);
    }
    
    console.log('\n📁 BREAKDOWN BY FILE TYPE:');
    const typeCounts = {};
    totalDocuments.forEach(doc => {
      const source = doc.metadata.source || 'unknown';
      const extension = source.includes('.') ? source.split('.').pop().toLowerCase() : 'no-extension';
      typeCounts[extension] = (typeCounts[extension] || 0) + 1;
    });
    
    for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`   - .${type}: ${count} files`);
    }
  }
  
  // Show what's being missed
  console.log('\n🚫 WHAT YOU\'RE MISSING:');
  console.log('The current configuration excludes:');
  console.log('   - Everything in backend/ directory (your main codebase!)');
  console.log('   - Everything in client/ directory');  
  console.log('   - Everything in tools/ directory');
  console.log('   - All nested files due to recursive timeouts');
  console.log('\n💡 RECOMMENDATION:');
  console.log('To see more files, you need to:');
  console.log('   1. Remove backend/** from ignoreFiles in batch 1');
  console.log('   2. Increase timeout from 30 seconds');
  console.log('   3. Or add specific path targeting');
}

if (require.main === module) {
  showLoadedDocuments().catch(console.error);
}

module.exports = { showLoadedDocuments };