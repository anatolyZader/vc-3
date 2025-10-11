#!/usr/bin/env node

/**
 * Test script for UbiquitousLanguageEnhancer
 * Tests all the critical fixes we applied
 */

const path = require('path');
const UbiquitousLanguageEnhancer = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/enhancers/ubiquitousLanguageEnhancer');

async function testEnhancer() {
  console.log('🧪 Testing UbiquitousLanguageEnhancer...\n');

  // Test 1: Constructor with custom options
  console.log('1️⃣ Testing constructor with custom options...');
  const enhancer = new UbiquitousLanguageEnhancer({
    relevanceThreshold: 0.05, // Lower threshold for more sensitive detection
    entityWeight: 0.4,
    eventWeight: 0.3,
    behaviorWeight: 0.2,
    valueObjectWeight: 0.1
  });
  console.log('✅ Constructor initialized with custom options');
  console.log(`   Threshold: ${enhancer.options.relevanceThreshold}`);
  console.log(`   Weights: entity=${enhancer.options.entityWeight}, event=${enhancer.options.eventWeight}\n`);

  // Test 2: Dictionary loading (async)
  console.log('2️⃣ Testing async dictionary loading...');
  try {
    const dictionary = await enhancer.getDictionary();
    console.log('✅ Dictionary loaded successfully');
    console.log(`   Business modules: ${Object.keys(dictionary.businessModules || {}).length}`);
    console.log(`   Technical terms: ${Object.keys(dictionary.technicalTerms || {}).length}`);
    console.log(`   Business terms: ${Object.keys(dictionary.businessTerms || {}).length}\n`);
  } catch (error) {
    console.error('❌ Dictionary loading failed:', error.message);
    return;
  }

  // Test 3: Word boundary matching
  console.log('3️⃣ Testing word boundary matching...');
  const testCases = [
    { content: 'authentication system', term: 'auth', shouldMatch: false },
    { content: 'oauth integration', term: 'auth', shouldMatch: false },
    { content: 'auth module handles login', term: 'auth', shouldMatch: true },
    { content: 'user authentication', term: 'authentication', shouldMatch: true },
  ];

  testCases.forEach(({ content, term, shouldMatch }, index) => {
    const result = enhancer.hasWordBoundaryMatch(content, term);
    const status = result === shouldMatch ? '✅' : '❌';
    console.log(`   ${status} "${term}" in "${content}" → ${result} (expected: ${shouldMatch})`);
  });
  console.log();

  // Test 4: Document enhancement (first time)
  console.log('4️⃣ Testing document enhancement...');
  const testDocument = {
    pageContent: 'This is a chat module that handles conversation management and user authentication. It uses RAG for intelligent responses.',
    metadata: {
      source: '/home/user/project/chat/conversation.js',
      type: 'code'
    }
  };

  try {
    const enhanced = await enhancer.enhanceWithUbiquitousLanguage(testDocument);
    console.log('✅ Document enhanced successfully');
    console.log(`   Business module: ${enhanced.metadata.ubiq_business_module}`);
    console.log(`   Bounded context: ${enhanced.metadata.ubiq_bounded_context}`);
    console.log(`   Domain events: ${enhanced.metadata.ubiq_domain_events?.length || 0}`);
    console.log(`   Relevant terms: ${enhanced.metadata.ubiq_terminology?.length || 0}`);
    console.log(`   Has annotation: ${!!enhanced.metadata.ubiq_annotation}`);
    console.log(`   Enhanced flag: ${enhanced.metadata.ubiq_enhanced}`);
    console.log(`   PageContent unchanged: ${enhanced.pageContent === testDocument.pageContent}`);
    console.log();

    // Test 5: Idempotency guard
    console.log('5️⃣ Testing idempotency guard...');
    const enhancedAgain = await enhancer.enhanceWithUbiquitousLanguage(enhanced);
    const isIdempotent = enhancedAgain === enhanced; // Should return same object
    console.log(`   ${isIdempotent ? '✅' : '❌'} Idempotency guard working: ${isIdempotent}`);
    console.log();

  } catch (error) {
    console.error('❌ Document enhancement failed:', error.message);
    console.error(error.stack);
  }

  // Test 6: Module detection from path
  console.log('6️⃣ Testing module detection from paths...');
  const pathTests = [
    { source: '/project/chat/module.js', expected: 'chat' },
    { source: '/project/ai/processor.js', expected: 'ai' },
    { source: '/project\\git\\repository.js', expected: 'git' }, // Windows path
    { source: '/project/unknown/file.js', expected: 'unknown' },
  ];

  pathTests.forEach(({ source, expected }) => {
    const detected = enhancer.detectBusinessModule('some content', source);
    const status = detected === expected ? '✅' : '❌';
    console.log(`   ${status} "${source}" → "${detected}" (expected: "${expected}")`);
  });
  console.log();

  // Test 7: Content-based module detection
  console.log('7️⃣ Testing content-based module detection...');
  const contentTests = [
    { 
      content: 'conversation startConversation addQuestion chat interface',
      expected: 'chat'
    },
    {
      content: 'generateResponse processContext AIResponse embeddings',
      expected: 'ai' 
    },
    {
      content: 'repository fetchRepo GitProject version control',
      expected: 'git'
    }
  ];

  for (const { content, expected } of contentTests) {
    const detected = enhancer.detectBusinessModule(content, '/unknown/path.js');
    const status = detected === expected ? '✅' : '❌';
    console.log(`   ${status} Content detection → "${detected}" (expected: "${expected}")`);
  }
  console.log();

  // Test 8: Schema normalization
  console.log('8️⃣ Testing schema normalization...');
  const testDict = {
    businessTerms: {
      stringTerm: 'Simple string value',
      objectTerm: { name: 'Object Term', description: 'Has proper structure' },
      noNameTerm: { description: 'Missing name field' }
    },
    technicalTerms: {
      simpleTech: 'Just a string'
    },
    domainEvents: {
      testModule: [
        'SimpleEvent',
        { name: 'ComplexEvent', description: 'Event object' }
      ]
    }
  };

  const normalized = enhancer.normalizeDictionary(testDict);
  
  // Check businessTerms normalization
  const stringTermOk = normalized.businessTerms.stringTerm.name === 'Simple string value';
  const objectTermOk = normalized.businessTerms.objectTerm.name === 'Object Term';
  const noNameTermOk = normalized.businessTerms.noNameTerm.name === 'noNameTerm';
  
  console.log(`   ${stringTermOk ? '✅' : '❌'} String term normalized`);
  console.log(`   ${objectTermOk ? '✅' : '❌'} Object term preserved`);
  console.log(`   ${noNameTermOk ? '✅' : '❌'} Missing name field added`);
  
  // Check domainEvents normalization
  const eventsOk = Array.isArray(normalized.domainEvents.testModule) && 
                   normalized.domainEvents.testModule.every(e => typeof e === 'string');
  console.log(`   ${eventsOk ? '✅' : '❌'} Domain events normalized to strings`);
  console.log();

  console.log('🎉 All tests completed!\n');
}

// Run the tests
testEnhancer().catch(error => {
  console.error('💥 Test suite failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});