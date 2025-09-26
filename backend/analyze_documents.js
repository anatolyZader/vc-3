#!/usr/bin/env node

// Detailed document analysis script
const { GithubRepoLoader } = require('@langchain/community/document_loaders/web/github');

async function analyzeRepositoryDocuments() {
  console.log('🔍 DETAILED REPOSITORY DOCUMENT ANALYSIS');
  console.log('=' .repeat(60));
  
  require('dotenv').config();
  const githubToken = process.env.GITHUB_TOKEN;
  
  if (!githubToken) {
    console.error('❌ No GitHub token found');
    return;
  }

  const repoUrl = 'https://github.com/anatolyZader/vc-3';
  
  try {
    // First, let's see ALL files in the repository without filtering
    console.log('\n📂 ANALYSIS 1: All files in repository (no filtering)');
    const allFilesLoader = new GithubRepoLoader(repoUrl, {
      branch: 'main',
      recursive: true,
      maxConcurrency: 1,
      accessToken: githubToken,
      ignorePaths: [] // No ignoring - get everything
    });
    
    console.log('⏳ Loading ALL files...');
    const allDocuments = await allFilesLoader.load();
    console.log(`✅ Total files in repository: ${allDocuments.length}`);
    
    // Group by directory and show breakdown
    const filesByDirectory = {};
    const filesByType = {};
    
    allDocuments.forEach(doc => {
      const source = doc.metadata.source || 'unknown';
      const directory = source.includes('/') ? source.split('/')[0] : 'root';
      const extension = source.includes('.') ? source.split('.').pop().toLowerCase() : 'no-extension';
      
      if (!filesByDirectory[directory]) filesByDirectory[directory] = [];
      filesByDirectory[directory].push(source);
      
      if (!filesByType[extension]) filesByType[extension] = 0;
      filesByType[extension]++;
    });
    
    console.log('\n📁 Files by directory:');
    for (const [dir, files] of Object.entries(filesByDirectory)) {
      console.log(`  📂 ${dir}/: ${files.length} files`);
      if (files.length <= 10) {
        files.forEach(file => console.log(`    - ${file}`));
      } else {
        files.slice(0, 5).forEach(file => console.log(`    - ${file}`));
        console.log(`    ... and ${files.length - 5} more files`);
      }
    }
    
    console.log('\n📄 Files by type:');
    for (const [ext, count] of Object.entries(filesByType).sort((a, b) => b[1] - a[1])) {
      console.log(`  .${ext}: ${count} files`);
    }
    
    // Now let's see what our current batch filters are capturing
    console.log('\n📂 ANALYSIS 2: What our current batches capture');
    
    const batches = [
      {
        name: 'Core Documentation',
        recursive: false,
        ignoreFiles: [
          'node_modules/**', '.git/**', 'dist/**', 'build/**', 'coverage/**', 'temp/**',
          '*.log', '*.lock', '*.tmp', '.DS_Store', '**/.DS_Store', '*.min.js', '*.min.css',
          'backend/**', 'client/**', 'tools/**'
        ]
      },
      {
        name: 'Backend JavaScript/TypeScript',
        recursive: true,
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
        recursive: true,
        fileTypeFilter: ['md', 'json', 'yml', 'yaml'],
        ignoreFiles: [
          'node_modules/**', '.git/**', 'dist/**', 'build/**', 'coverage/**', 'temp/**',
          '*.log', '*.lock', '*.tmp', '.DS_Store', '**/.DS_Store', '*.min.js', '*.min.css',
          'client/**', 'tools/**',
          'package-lock.json', 'yarn.lock'
        ]
      }
    ];
    
    for (const batch of batches) {
      console.log(`\n🔍 ${batch.name}:`);
      
      const batchLoader = new GithubRepoLoader(repoUrl, {
        branch: 'main',
        recursive: batch.recursive,
        maxConcurrency: 1,
        accessToken: githubToken,
        ignorePaths: batch.ignoreFiles
      });
      
      const batchDocs = await batchLoader.load();
      
      let filteredDocs = batchDocs;
      if (batch.fileTypeFilter) {
        filteredDocs = batchDocs.filter(doc => {
          if (!doc.metadata.source) return false;
          const fileExtension = doc.metadata.source.includes('.') ? 
            doc.metadata.source.split('.').pop().toLowerCase() : '';
          return batch.fileTypeFilter.includes(fileExtension);
        });
      }
      
      console.log(`  📊 Raw loaded: ${batchDocs.length} files`);
      console.log(`  📊 After filtering: ${filteredDocs.length} files`);
      
      if (filteredDocs.length > 0) {
        console.log('  📄 Files included:');
        filteredDocs.forEach(doc => {
          const size = doc.pageContent.length;
          const preview = doc.pageContent.substring(0, 50).replace(/\n/g, ' ');
          console.log(`    - ${doc.metadata.source} (${size} chars) "${preview}..."`);
        });
      } else {
        console.log('  ⚠️ No files matched this batch criteria');
      }
    }
    
    // Show what's being excluded and why
    console.log('\n🚫 ANALYSIS 3: What files are being excluded and why');
    
    // Files that would be excluded by the ignore patterns
    const excludedFiles = allDocuments.filter(doc => {
      const source = doc.metadata.source || '';
      
      // Check if it's in backend/ or client/ (excluded from first batch)
      if (source.startsWith('backend/') || source.startsWith('client/')) {
        return true;
      }
      
      // Check if it's a JS/TS file but not in backend/
      const isJsTs = ['js', 'ts', 'jsx', 'tsx'].includes(
        source.includes('.') ? source.split('.').pop().toLowerCase() : ''
      );
      if (isJsTs && !source.startsWith('backend/')) {
        return false; // This would be processed by batch 2
      }
      
      return false;
    });
    
    console.log(`📊 Files excluded by current filtering: ${excludedFiles.length}`);
    excludedFiles.forEach(doc => {
      console.log(`  🚫 ${doc.metadata.source} - Reason: In excluded directory`);
    });
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

if (require.main === module) {
  analyzeRepositoryDocuments();
}

module.exports = { analyzeRepositoryDocuments };