#!/usr/bin/env node

/**
 * Debug AI module detection
 */

const UbiquitousLanguageEnhancer = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/enhancers/ubiquitousLanguageEnhancer');

async function debugAIDetection() {
  const enhancer = new UbiquitousLanguageEnhancer({ relevanceThreshold: 0.05 });
  const dictionary = await enhancer.getDictionary();
  
  console.log('🔍 Debugging AI module detection...\n');
  
  // Check what AI module contains
  const aiModule = dictionary.businessModules.ai;
  console.log('AI Module entities:');
  aiModule.entities?.forEach(entity => {
    console.log(`  - ${entity.name}: ${entity.behaviors?.join(', ') || 'no behaviors'}`);
  });
  
  console.log('\nAI Module domain events:');
  aiModule.domainEvents?.forEach(event => {
    console.log(`  - ${event.name || event}`);
  });
  
  console.log('\nAI Module value objects:');
  aiModule.valueObjects?.forEach(vo => {
    console.log(`  - ${vo.name}`);
  });
  
  // Test content
  const testContent = 'generateResponse processContext AIResponse embeddings';
  console.log(`\nTesting content: "${testContent}"`);
  
  // Check word boundary matches
  console.log('\nWord boundary matches:');
  ['generateResponse', 'processContext', 'AIResponse', 'embeddings'].forEach(term => {
    const matches = enhancer.hasWordBoundaryMatch(testContent, term);
    console.log(`  - "${term}": ${matches}`);
  });
  
  // Calculate score
  const score = enhancer.calculateModuleRelevanceScore(testContent, aiModule);
  console.log(`\nAI module relevance score: ${score}`);
  console.log(`Threshold: ${enhancer.options.relevanceThreshold}`);
  console.log(`Should detect AI: ${score > enhancer.options.relevanceThreshold}`);
  
  // Test detection
  const detected = enhancer.detectBusinessModule(testContent, '/unknown/path.js');
  console.log(`\nActual detection result: "${detected}"`);
}

debugAIDetection().catch(console.error);