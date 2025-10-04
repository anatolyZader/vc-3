// test_repo_characteristics.js - Test the enhanced getRepositoryCharacteristics method
"use strict";

const RepoPreparation = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/repoPreparation');

async function testRepositoryCharacteristics() {
  console.log(`[${new Date().toISOString()}] 🧪 TESTING: Enhanced Repository Characteristics Gathering\n`);
  
  const repoPreparation = new RepoPreparation();
  
  // Test with a real repository
  const testRepos = [
    { owner: 'microsoft', repo: 'vscode', expectedType: 'frontend' },
    { owner: 'nodejs', repo: 'node', expectedType: 'backend' },
    { owner: 'facebook', repo: 'react', expectedType: 'library' },
    // Test with the current repository if possible
    { owner: 'anatolyZader', repo: 'vc-3', expectedType: 'general' }
  ];
  
  for (const testRepo of testRepos) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TESTING: ${testRepo.owner}/${testRepo.repo}`);
    console.log(`Expected Type: ${testRepo.expectedType}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      const characteristics = await repoPreparation.getRepositoryCharacteristics(
        testRepo.owner, 
        testRepo.repo
      );
      
      console.log(`📊 REPOSITORY CHARACTERISTICS:`);
      console.log(`   Type: ${characteristics.type}`);
      console.log(`   Size: ${characteristics.estimatedSize} KB`);
      console.log(`   Primary Language: ${characteristics.primaryLanguage}`);
      console.log(`   Stars: ${characteristics.starCount}`);
      console.log(`   Forks: ${characteristics.forkCount}`);
      console.log(`   Private: ${characteristics.isPrivate}`);
      
      const typeMatch = characteristics.type === testRepo.expectedType;
      console.log(`   Expected Type: ${testRepo.expectedType}`);
      console.log(`   Result: ${typeMatch ? '✅ TYPE MATCH' : '📝 Different type detected'}`);
      
    } catch (error) {
      console.error(`❌ ERROR:`, error.message);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎯 REPOSITORY CHARACTERISTICS TESTING COMPLETE`);
  console.log(`${'='.repeat(60)}\n`);
}

// Run the test if this file is executed directly
if (require.main === module) {
  testRepositoryCharacteristics().catch(console.error);
}

module.exports = { testRepositoryCharacteristics };