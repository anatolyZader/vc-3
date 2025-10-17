#!/usr/bin/env node

// Test with NO filtering to see what's actually in vc-3
const { GithubRepoLoader } = require('@langchain/community/document_loaders/web/github');

async function testUnfilteredRepository() {
  console.log('🔍 TESTING VC-3 WITH NO FILTERS');
  console.log('🎯 Let\'s see what\'s REALLY in your repository');
  console.log('=' .repeat(60));
  
  require('dotenv').config();
  const githubToken = process.env.GITHUB_TOKEN;
  
  if (!githubToken) {
    console.error('❌ No GitHub token found');
    return;
  }

  const repoUrl = 'https://github.com/anatolyZader/vc-3';
  
  try {
    console.log('🔄 Loading with minimal filtering (just excluding obvious junk)...');
    
    const loader = new GithubRepoLoader(repoUrl, {
      branch: 'main',
      recursive: true, // Get everything
      maxConcurrency: 1,
      accessToken: githubToken,
      ignorePaths: [
        'node_modules/**', 
        '.git/**',
        '*.log',
        '*.tmp',
        '.DS_Store'
      ] // Minimal filtering
    });
    
    console.log('⏳ Loading all files (this might take a while for large repos)...');
    const startTime = Date.now();
    
    // Add timeout
    const loadPromise = loader.load();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout after 2 minutes')), 120000);
    });
    
    let documents;
    try {
      documents = await Promise.race([loadPromise, timeoutPromise]);
    } catch (timeoutError) {
      if (timeoutError.message.includes('Timeout')) {
        console.log('⏰ Timed out after 2 minutes - repository is very large');
        console.log('💡 This explains why batches are timing out!');
        return;
      }
      throw timeoutError;
    }
    
    const endTime = Date.now();
    console.log(`✅ Loaded ${documents.length} documents in ${endTime - startTime}ms`);
    
    if (documents.length === 0) {
      console.log('❌ No documents loaded! This could be:');
      console.log('  - Repository is private and token lacks access');
      console.log('  - Repository is empty');
      console.log('  - GitHub API rate limiting');
      console.log('  - Token expired or invalid');
      return;
    }
    
    // Analyze what we got
    const directories = new Set();
    const fileTypes = {};
    
    documents.forEach(doc => {
      const source = doc.metadata.source || 'unknown';
      const directory = source.includes('/') ? source.split('/')[0] : 'root';
      const extension = source.includes('.') ? source.split('.').pop().toLowerCase() : 'no-extension';
      
      directories.add(directory);
      fileTypes[extension] = (fileTypes[extension] || 0) + 1;
    });
    
    console.log('\n📂 ACTUAL DIRECTORY STRUCTURE:');
    Array.from(directories).sort().forEach(dir => {
      const filesInDir = documents.filter(doc => {
        const source = doc.metadata.source || '';
        return dir === 'root' ? !source.includes('/') : source.startsWith(dir + '/');
      });
      console.log(`  📁 ${dir}/: ${filesInDir.length} files`);
    });
    
    console.log('\n📄 FILE TYPES:');
    Object.entries(fileTypes).sort((a, b) => b[1] - a[1]).forEach(([ext, count]) => {
      console.log(`  .${ext}: ${count} files`);
    });
    
    // Check specifically for backend files
    const backendFiles = documents.filter(doc => 
      doc.metadata.source && doc.metadata.source.startsWith('backend/')
    );
    
    console.log(`\n🏗️ BACKEND FILES: ${backendFiles.length}`);
    if (backendFiles.length > 0) {
      console.log('✅ Found backend files! The "2 files bug" was definitely the batch filtering.');
      backendFiles.slice(0, 10).forEach(file => 
        console.log(`  - ${file.metadata.source}`)
      );
      if (backendFiles.length > 10) {
        console.log(`  ... and ${backendFiles.length - 10} more backend files`);
      }
    } else {
      console.log('❌ No backend/ directory found in this repository');
      console.log('💡 Check if your app code is in a different directory structure');
    }
    
    // Show some actual file contents to verify
    console.log('\n📋 SAMPLE FILE CONTENTS:');
    documents.slice(0, 3).forEach((doc, index) => {
      const preview = doc.pageContent.substring(0, 200).replace(/\n/g, ' ');
      console.log(`${index + 1}. ${doc.metadata.source} (${doc.pageContent.length} chars)`);
      console.log(`   Content: "${preview}..."`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n🔑 AUTHENTICATION ISSUE:');
      console.log('  - Your GitHub token might not have access to this repository');
      console.log('  - Check if the repository is private');
      console.log('  - Verify token permissions');
    }
  }
}

if (require.main === module) {
  testUnfilteredRepository();
}

module.exports = { testUnfilteredRepository };