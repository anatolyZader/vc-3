#!/usr/bin/env node
/**
 * LOCAL Re-indexing Trigger
 * 
 * This script simulates a repoPushed event locally without requiring Pub/Sub.
 * It directly calls the aiService.processPushedRepo method.
 */

require('dotenv').config({ path: './backend/.env' });
const path = require('path');

async function triggerLocalReindex() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔄 LOCAL REPOSITORY RE-INDEXING');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const userId = 'd41402df-182a-41ec-8f05-153118bf2718';
  const repoId = 'anatolyZader/vc-3';

  console.log(`📋 Configuration:`);
  console.log(`   User ID: ${userId}`);
  console.log(`   Repository: ${repoId}`);
  console.log(`   Method: Direct service call (no Pub/Sub required)\n`);

  try {
    // Initialize the DI container
    console.log('🔧 Initializing DI container...');
    const { diContainer } = require('./backend/infrastructure/dependency_injection/diContainer');
    
    // Resolve aiService
    console.log('🔍 Resolving aiService from DI container...');
    const aiService = await diContainer.resolve('aiService');
    
    if (!aiService) {
      throw new Error('❌ aiService not found in DI container');
    }
    
    console.log('✅ aiService resolved successfully\n');
    console.log('🚀 Starting repository processing...\n');
    
    // Call processPushedRepo
    await aiService.processPushedRepo(userId, repoId);
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ RE-INDEXING COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('🎯 Next steps:');
    console.log('   1. Query your RAG system: "list all methods in aiService.js"');
    console.log('   2. Check metadata for: semantic_role, unit_name, vibeswitch_module');
    console.log('   3. Verify all 3 methods visible (no "rechunked": true)\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n═══════════════════════════════════════════════════════════════');
    console.error('❌ RE-INDEXING FAILED');
    console.error('═══════════════════════════════════════════════════════════════\n');
    console.error('Error:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  triggerLocalReindex();
}

module.exports = { triggerLocalReindex };
