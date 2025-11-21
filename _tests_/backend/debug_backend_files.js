#!/usr/bin/env node

// Debug why we're getting 0 backend files
const { GithubRepoLoader } = require('@langchain/community/document_loaders/web/github');

async function debugBackendFiles() {
  console.log('🔍 DEBUGGING: Why are we getting 0 backend files?');
  console.log('=' .repeat(60));
  
  require('dotenv').config();
  const githubToken = process.env.GITHUB_TOKEN;
  
  if (!githubToken) {
    console.error('❌ No GitHub token found');
    return;
  }

  const repoUrl = 'https://github.com/anatolyZader/vc-3';
  
  try {
    // Test 1: Load with recursive=true to see if backend files exist
    console.log('\n🔍 TEST 1: Loading with recursive=true (should find backend files)');
    const recursiveLoader = new GithubRepoLoader(repoUrl, {
      branch: 'main',
      recursive: true,
      maxConcurrency: 1,
      accessToken: githubToken,
      ignorePaths: ['node_modules/**', '.git/**'] // Minimal filtering
    });
    
    console.log('⏳ Loading recursively...');
    let recursiveDocs = [];
    
    try {
      const loadPromise = recursiveLoader.load();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 30000);
      });
      
      recursiveDocs = await Promise.race([loadPromise, timeoutPromise]);
    } catch (error) {
      if (error.message === 'timeout') {
        console.log('⏰ Timed out after 30s (repository is large)');
        console.log('💡 This explains why our batches timeout!');
      } else {
        throw error;
      }
    }
    
    console.log(`📊 Recursive load result: ${recursiveDocs.length} documents`);
    
    // Check for backend files
    const backendFiles = recursiveDocs.filter(doc => 
      doc.metadata.source && doc.metadata.source.startsWith('backend/')
    );
    
    console.log(`🏗️ Backend files found: ${backendFiles.length}`);
    
    if (backendFiles.length > 0) {
      console.log('✅ Backend files exist! Sample files:');
      backendFiles.slice(0, 5).forEach(file => {
        console.log(`  - ${file.metadata.source} (${file.pageContent.length} chars)`);
      });
    } else if (recursiveDocs.length > 0) {
      console.log('❌ No backend files found, but other files exist. Directory structure:');
      const dirs = new Set();
      recursiveDocs.forEach(doc => {
        const source = doc.metadata.source || '';
        const dir = source.includes('/') ? source.split('/')[0] : 'root';
        dirs.add(dir);
      });
      console.log('📂 Directories found:', Array.from(dirs).sort());
    }
    
    // Test 2: Try loading with specific backend focus
    if (backendFiles.length > 0) {
      console.log('\n🔍 TEST 2: Try loading with backend-specific ignore patterns');
      
      const backendLoader = new GithubRepoLoader(repoUrl, {
        branch: 'main',
        recursive: true,
        maxConcurrency: 1,
        accessToken: githubToken,
        ignorePaths: [
          'node_modules/**', 
          '.git/**',
          'client/**',  // Ignore client to focus on backend
          '.github/**',
          '.vscode/**',
          '*.jar',
          '*.txt',
          '*.log'
        ]
      });
      
      console.log('⏳ Loading backend-focused...');
      try {
        const loadPromise = backendLoader.load();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('timeout')), 45000);
        });
        
        const backendDocs = await Promise.race([loadPromise, timeoutPromise]);
        console.log(`📊 Backend-focused load: ${backendDocs.length} documents`);
        
        const actualBackendFiles = backendDocs.filter(doc => 
          doc.metadata.source && doc.metadata.source.startsWith('backend/')
        );
        
        console.log(`🏗️ Actual backend files: ${actualBackendFiles.length}`);
        
        if (actualBackendFiles.length > 0) {
          console.log('✅ SUCCESS! We can load backend files with the right approach');
          console.log('🔧 Sample backend files:');
          actualBackendFiles.slice(0, 10).forEach(file => {
            const preview = file.pageContent.substring(0, 50).replace(/\n/g, ' ');
            console.log(`  - ${file.metadata.source} (${file.pageContent.length} chars) "${preview}..."`);
          });
        }
        
      } catch (timeoutError) {
        console.log('⏰ Backend-focused load also timed out');
      }
    }
    
  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
  }
}

if (require.main === module) {
  debugBackendFiles();
}

module.exports = { debugBackendFiles };