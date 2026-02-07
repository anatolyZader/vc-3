#!/usr/bin/env node

// Let's see what's actually in the anatolyZader/vc-3 repository
const { GithubRepoLoader } = require('@langchain/community/document_loaders/web/github');

const FileFilteringUtils = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/FileFilteringUtils');

async function exploreRepository() {
  console.log('🔍 EXPLORING ACTUAL REPOSITORY CONTENTS');
  console.log('🎯 Let\'s see what\'s really in anatolyZader/vc-3');
  console.log('=' .repeat(60));
  
  require('dotenv').config();
  const githubToken = process.env.GITHUB_TOKEN;
  
  if (!githubToken) {
    console.error('❌ No GitHub token found');
    return;
  }

  const repoUrl = 'https://github.com/anatolyZader/vc-3';
  
  try {
    // Load EVERYTHING recursively to see the full repository structure
    console.log('📥 Loading ALL files recursively...');
    const allFilesLoader = new GithubRepoLoader(repoUrl, {
      branch: 'main',
      recursive: true,
      maxConcurrency: 1,
      accessToken: githubToken,
      ignorePaths: FileFilteringUtils.getRepositoryIgnorePatterns().slice(0, 2) // Only ignore the most critical ones
    });
    
    const allDocuments = await allFilesLoader.load();
    console.log(`📊 Total files found: ${allDocuments.length}`);
    
    if (allDocuments.length === 0) {
      console.log('⚠️ No files found! Repository might be empty or private.');
      return;
    }
    
    // Show the complete file structure
    console.log('\n📂 COMPLETE FILE STRUCTURE:');
    allDocuments.forEach((doc, index) => {
      const source = doc.metadata.source || 'unknown';
      const size = doc.pageContent.length;
      const preview = doc.pageContent.substring(0, 50).replace(/\n/g, ' ').trim();
      
      console.log(`${index + 1}. ${source} (${size} chars)`);
      console.log(`   Preview: "${preview}${size > 50 ? '...' : ''}"`);
      console.log('');
    });
    
    // Analyze the structure
    const directories = new Set();
    const fileTypes = {};
    
    allDocuments.forEach(doc => {
      const source = doc.metadata.source || 'unknown';
      
      // Extract directory structure
      const pathParts = source.split('/');
      if (pathParts.length > 1) {
        directories.add(pathParts[0]);
      } else {
        directories.add('root');
      }
      
      // Extract file types
      const extension = source.includes('.') ? source.split('.').pop().toLowerCase() : 'no-extension';
      fileTypes[extension] = (fileTypes[extension] || 0) + 1;
    });
    
    console.log('\n📁 Directory structure:');
    Array.from(directories).sort().forEach(dir => {
      const filesInDir = allDocuments.filter(doc => {
        const source = doc.metadata.source || '';
        return dir === 'root' ? !source.includes('/') : source.startsWith(dir + '/');
      });
      console.log(`  📂 ${dir}/: ${filesInDir.length} files`);
    });
    
    console.log('\n📄 File types:');
    Object.entries(fileTypes).sort((a, b) => b[1] - a[1]).forEach(([ext, count]) => {
      console.log(`  .${ext}: ${count} files`);
    });
    
    // Now let's test with the ACTUAL repository structure we have here
    if (allDocuments.length < 20) {
      console.log('\n🎯 RECOMMENDATION:');
      console.log('This appears to be a small test repository with mostly root files.');
      console.log('The "2 files bug" was likely caused by the original Git errors, not batch filtering.');
      console.log('\nTo test with a real backend repository, try:');
      console.log('- https://github.com/anatolyZader/vibeswitch (your main project)');
      console.log('- Any repository with actual backend/ directory');
    }
    
  } catch (error) {
    console.error('❌ Exploration failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

if (require.main === module) {
  exploreRepository();
}

module.exports = { exploreRepository };