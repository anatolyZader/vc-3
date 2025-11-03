#!/usr/bin/env node
/**
 * Test script to verify UL enhancement is working during document processing
 * This simulates the indexing flow and checks if UL tags are being created
 */

const path = require('path');

// Test document that should trigger UL enhancement
const testDocument = {
  pageContent: `
    class GitHubRepository {
      constructor(owner, name) {
        this.owner = owner;
        this.name = name;
      }
      
      async fetchCommits() {
        const commits = await this.api.getCommits();
        return commits;
      }
      
      async createPullRequest(branch, title) {
        const pr = await this.api.createPR({
          head: branch,
          base: 'main',
          title: title
        });
        return pr;
      }
    }
  `,
  metadata: {
    source: '/test/repo/github/repository.js',
    type: 'github-code',
    fileType: 'js'
  }
};

async function testULEnhancement() {
  console.log('🧪 Testing UL Enhancement Flow...\n');
  
  try {
    // Import the enhancer
    const UbiquitousLanguageEnhancer = require('../business_modules/ai/infrastructure/ai/rag_pipelines/context/enhancers/ubiquitousLanguageEnhancer');
    
    console.log('✅ Step 1: UbiquitousLanguageEnhancer imported');
    
    // Create instance
    const enhancer = new UbiquitousLanguageEnhancer();
    console.log('✅ Step 2: Enhancer instance created');
    
    // Test enhancement
    console.log('\n📋 Step 3: Testing document enhancement...');
    console.log('Input document:');
    console.log('  - pageContent length:', testDocument.pageContent.length);
    console.log('  - source:', testDocument.metadata.source);
    console.log('  - Has ubiq_enhanced?', !!testDocument.metadata.ubiq_enhanced);
    
    const enhanced = await enhancer.enhanceWithUbiquitousLanguage(testDocument);
    
    console.log('\n✅ Step 4: Enhancement complete!');
    console.log('\nEnhanced document metadata:');
    console.log('  - ul_version:', enhanced.metadata.ul_version);
    console.log('  - ul_bounded_context:', enhanced.metadata.ul_bounded_context);
    console.log('  - ul_terms:', enhanced.metadata.ul_terms);
    console.log('  - ul_match_count:', enhanced.metadata.ul_match_count);
    console.log('  - ubiq_enhanced:', enhanced.metadata.ubiq_enhanced);
    console.log('  - ubiq_business_module:', enhanced.metadata.ubiq_business_module);
    
    // Check if UL tags were created
    const hasULTags = Array.isArray(enhanced.metadata.ul_terms) && enhanced.metadata.ul_terms.length > 0;
    
    console.log('\n' + '='.repeat(60));
    if (hasULTags) {
      console.log('✅ SUCCESS: UL tags were created!');
      console.log(`   Found ${enhanced.metadata.ul_terms.length} UL terms: ${enhanced.metadata.ul_terms.slice(0, 5).join(', ')}`);
    } else {
      console.log('⚠️  WARNING: No UL tags found in enhanced document');
      console.log('   ul_terms is:', enhanced.metadata.ul_terms);
    }
    console.log('='.repeat(60));
    
    return enhanced;
    
  } catch (error) {
    console.error('\n❌ ERROR during UL enhancement test:');
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testULEnhancement()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
