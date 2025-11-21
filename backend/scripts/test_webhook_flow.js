#!/usr/bin/env node
/**
 * Simulate the complete webhook flow to test UL enhancement
 * This mimics what happens when GitHub Actions publishes repoPushed event
 */

const path = require('path');

// Load environment variables
require('dotenv').config();

async function testWebhookFlow() {
  console.log('🧪 Testing Complete Webhook → Indexing → UL Enhancement Flow\n');
  
  try {
    // Step 1: Load ContextPipeline
    console.log('Step 1: Loading ContextPipeline...');
    const ContextPipeline = require('../business_modules/ai/infrastructure/ai/rag_pipelines/context/contextPipeline');
    console.log('✅ ContextPipeline loaded');
    
    // Step 2: Initialize ContextPipeline (mimics what happens in DI container)
    console.log('\nStep 2: Initializing ContextPipeline...');
    const pipeline = new ContextPipeline({
      embeddings: null, // Mock for now
      eventBus: { emit: () => {}, on: () => {} }, // Mock event bus
      pineconeLimiter: null,
      config: {}
    });
    console.log('✅ ContextPipeline initialized');
    
    // Step 3: Check if repoProcessor has ubiquitousLanguageProcessor
    console.log('\nStep 3: Verifying UL processor injection...');
    console.log('  - repoProcessor exists?', !!pipeline.repoProcessor);
    console.log('  - ubiquitousLanguageProcessor exists?', !!pipeline.repoProcessor?.ubiquitousLanguageProcessor);
    
    if (!pipeline.repoProcessor?.ubiquitousLanguageProcessor) {
      console.error('❌ PROBLEM FOUND: ubiquitousLanguageProcessor NOT injected into repoProcessor!');
      console.error('   This explains why UL tags are not being created during indexing.');
      return false;
    }
    
    console.log('✅ ubiquitousLanguageProcessor is properly injected');
    
    // Step 4: Test document processing flow
    console.log('\nStep 4: Testing document processing...');
    const testDoc = {
      pageContent: 'class TestClass { async processData() { return data; } }',
      metadata: {
        source: '/test/file.js',
        type: 'github-code'
      }
    };
    
    console.log('  - Calling intelligentProcessDocuments...');
    const processed = await pipeline.repoProcessor.intelligentProcessDocuments([testDoc]);
    
    console.log('\nStep 5: Verifying UL tags in processed document...');
    const doc = processed[0];
    console.log('  - ul_version:', doc.metadata.ul_version);
    console.log('  - ul_terms:', doc.metadata.ul_terms);
    console.log('  - ul_match_count:', doc.metadata.ul_match_count);
    console.log('  - ubiq_enhanced:', doc.metadata.ubiq_enhanced);
    
    const hasULTags = doc.metadata.ubiq_enhanced === true && 
                     Array.isArray(doc.metadata.ul_terms);
    
    console.log('\n' + '='.repeat(70));
    if (hasULTags) {
      console.log('✅ SUCCESS: Complete webhook flow works! UL tags are being created.');
      console.log(`   Found ${doc.metadata.ul_terms.length} UL terms: ${doc.metadata.ul_terms.slice(0, 5).join(', ')}`);
    } else {
      console.log('❌ FAILURE: UL tags NOT created in webhook flow');
      console.log('   ubiq_enhanced:', doc.metadata.ubiq_enhanced);
      console.log('   ul_terms:', doc.metadata.ul_terms);
    }
    console.log('='.repeat(70));
    
    return hasULTags;
    
  } catch (error) {
    console.error('\n❌ ERROR during webhook flow test:');
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
    return false;
  }
}

// Run the test
testWebhookFlow()
  .then((success) => {
    if (success) {
      console.log('\n✅ All tests passed - webhook flow is working correctly');
      process.exit(0);
    } else {
      console.log('\n❌ Tests failed - webhook flow has issues');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });
