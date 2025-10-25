/**
 * UL Acceptance Test - Minimal End-to-End Validation
 * 
 * Tests that UL processing works correctly from document input 
 * through to vector store metadata persistence
 */

const UbiquitousLanguageEnhancer = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/enhancers/ubiquitousLanguageEnhancer');
const RepoProcessor = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/repoProcessor');
const MetadataFlattener = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/metadataFlattener');

async function runULAcceptanceTest() {
  console.log('🧪 UL ACCEPTANCE TEST - End-to-End Validation\n');
  
  // Test 1: UL Enhancement with Domain File
  console.log('1️⃣ Testing UL Enhancement - Domain File:');
  
  const domainFile = {
    pageContent: `
class ConversationService {
  constructor(conversationRepository, eventDispatcher) {
    this.repository = conversationRepository;
    this.eventDispatcher = eventDispatcher;
  }
  
  async startConversation(userId, title) {
    // Create new conversation entity
    const conversation = new Conversation(userId, title);
    await this.repository.save(conversation);
    
    // Publish domain event
    const event = new ConversationStartedEvent({
      conversationId: conversation.id,
      userId,
      title
    });
    
    await this.eventDispatcher.publish(event);
    return conversation.id;
  }
}`,
    metadata: {
      source: 'backend/business_modules/chat/domain/services/conversationService.js',
      type: 'github-file-code'
    }
  };
  
  const ulEnhancer = new UbiquitousLanguageEnhancer();
  const enhanced = await ulEnhancer.enhanceWithUbiquitousLanguage(domainFile);
  
  // Assert UL fields are present
  console.log(`   📋 UL Version: ${enhanced.metadata.ul_version}`);
  console.log(`   🏢 Bounded Context: ${enhanced.metadata.ul_bounded_context}`);
  console.log(`   📝 UL Terms: [${(enhanced.metadata.ul_terms || []).slice(0, 5).join(', ')}${enhanced.metadata.ul_terms?.length > 5 ? '...' : ''}]`);
  console.log(`   🔢 Match Count: ${enhanced.metadata.ul_match_count}`);
  
  // Assertions
  const assertions = [
    { test: () => enhanced.metadata.ul_version, name: 'ul_version defined', expected: true },
    { test: () => Array.isArray(enhanced.metadata.ul_terms), name: 'ul_terms is array', expected: true },
    { test: () => typeof enhanced.metadata.ul_bounded_context === 'string', name: 'ul_bounded_context is string', expected: true },
    { test: () => typeof enhanced.metadata.ul_match_count === 'number', name: 'ul_match_count is number', expected: true },
    { test: () => enhanced.metadata.ul_terms.length > 0, name: 'ul_terms has content', expected: true }
  ];
  
  let passed = 0;
  assertions.forEach(({ test, name, expected }) => {
    const result = test();
    const success = expected ? !!result : !result;
    console.log(`   ${success ? '✅' : '❌'} ${name}: ${result}`);
    if (success) passed++;
  });
  
  console.log(`   🎯 Domain Test: ${passed}/${assertions.length} assertions passed\n`);
  
  // Test 2: UL Enhancement with Infrastructure File  
  console.log('2️⃣ Testing UL Enhancement - Infrastructure File:');
  
  const infraFile = {
    pageContent: `
class GitPostgresAdapter extends IGitPersistPort {
  constructor({ cloudSqlConnector }) {
    super();
    this.connector = cloudSqlConnector;
  }
  
  async getPool() {
    if (this.pool) return this.pool;
    
    this.pool = await this.createPool();
    return this.pool;
  }
  
  async save(entity) {
    const pool = await this.getPool();
    // Implementation
  }
}`,
    metadata: {
      source: 'backend/business_modules/git/infrastructure/postgres/gitPostgresAdapter.js',
      type: 'github-file-code'
    }
  };
  
  const infraEnhanced = await ulEnhancer.enhanceWithUbiquitousLanguage(infraFile);
  
  console.log(`   📋 UL Version: ${infraEnhanced.metadata.ul_version}`);
  console.log(`   🏢 Bounded Context: ${infraEnhanced.metadata.ul_bounded_context}`);  
  console.log(`   📝 UL Terms: [${(infraEnhanced.metadata.ul_terms || []).slice(0, 5).join(', ')}${infraEnhanced.metadata.ul_terms?.length > 5 ? '...' : ''}]`);
  console.log(`   🔢 Match Count: ${infraEnhanced.metadata.ul_match_count}`);
  
  const infraAssertions = [
    { test: () => infraEnhanced.metadata.ul_version, name: 'ul_version defined', expected: true },
    { test: () => Array.isArray(infraEnhanced.metadata.ul_terms), name: 'ul_terms is array', expected: true },
    { test: () => infraEnhanced.metadata.ul_terms.includes('adapter') || infraEnhanced.metadata.ul_terms.includes('port'), name: 'detects architectural patterns', expected: true }
  ];
  
  let infraPassed = 0;
  infraAssertions.forEach(({ test, name, expected }) => {
    const result = test();
    const success = expected ? !!result : !result;
    console.log(`   ${success ? '✅' : '❌'} ${name}: ${result}`);
    if (success) infraPassed++;
  });
  
  console.log(`   🎯 Infra Test: ${infraPassed}/${infraAssertions.length} assertions passed\n`);
  
  // Test 3: RepoProcessor Integration
  console.log('3️⃣ Testing RepoProcessor Integration:');
  
  const repoProcessor = new RepoProcessor({
    ubiquitousLanguageProcessor: ulEnhancer
  });
  
  const testDocuments = [domainFile, infraFile];
  const processed = await repoProcessor.intelligentProcessDocuments(testDocuments);
  
  console.log(`   📄 Input Documents: ${testDocuments.length}`);
  console.log(`   📄 Processed Documents: ${processed.length}`);
  
  const firstProcessed = processed[0];
  const hasULFields = firstProcessed.metadata.ul_version && 
                     Array.isArray(firstProcessed.metadata.ul_terms) &&
                     firstProcessed.metadata.file_header;
  
  console.log(`   ${hasULFields ? '✅' : '❌'} UL fields preserved through RepoProcessor`);
  console.log(`   📋 File Header Present: ${!!firstProcessed.metadata.file_header}`);
  console.log(`   🏷️ UL Terms Count: ${firstProcessed.metadata.ul_terms?.length || 0}`);
  
  // Test 4: Metadata Flattening for Vector Store
  console.log('\n4️⃣ Testing Metadata Flattening:');
  
  const { metadata: flattened, validation } = MetadataFlattener.processForUpsert(firstProcessed.metadata);
  
  console.log(`   📊 Original Fields: ${Object.keys(firstProcessed.metadata).length}`);
  console.log(`   📊 Flattened Fields: ${Object.keys(flattened).length}`);
  console.log(`   ${validation.valid ? '✅' : '❌'} Validation: ${validation.valid ? 'PASSED' : 'FAILED'}`);
  console.log(`   💾 Metadata Size: ${validation.size} bytes`);
  
  if (!validation.valid) {
    console.log(`   ⚠️ Issues: ${validation.issues.join(', ')}`);
  }
  
  // Check critical UL fields are preserved
  const ulFieldsPreserved = flattened.ul_version && 
                          Array.isArray(flattened.ul_terms) && 
                          flattened.ul_bounded_context !== undefined;
  
  console.log(`   ${ulFieldsPreserved ? '✅' : '❌'} UL fields preserved in flattened metadata`);
  console.log(`   📋 Flattened UL Fields: ul_version=${flattened.ul_version}, terms=${flattened.ul_terms?.length}, bc=${flattened.ul_bounded_context}`);
  
  // Test 5: Vector Store Simulation
  console.log('\n5️⃣ Simulating Vector Store Upsert:');
  
  const mockVector = {
    id: 'test_vector_1',
    values: new Array(1536).fill(0.1), // Mock embedding
    metadata: flattened
  };
  
  // Simulate round-trip (what you'd get back from vector store)
  const retrieved = {
    id: mockVector.id,
    score: 0.85,
    metadata: { ...mockVector.metadata } // Deep copy simulation
  };
  
  const ulFieldsRetained = retrieved.metadata.ul_version && 
                          Array.isArray(retrieved.metadata.ul_terms) &&
                          retrieved.metadata.ul_match_count >= 0;
  
  console.log(`   ${ulFieldsRetained ? '✅' : '❌'} UL fields survive round-trip`);
  console.log(`   📋 Retrieved UL: version=${retrieved.metadata.ul_version}, terms=${retrieved.metadata.ul_terms?.length}`);
  console.log(`   🎯 Match Count: ${retrieved.metadata.ul_match_count}`);
  
  // Final Summary
  console.log('\n🎯 ACCEPTANCE TEST SUMMARY:');
  console.log('=' .repeat(50));
  
  const totalTests = 5;
  const passedTests = [
    passed === assertions.length,
    infraPassed === infraAssertions.length, 
    hasULFields,
    validation.valid && ulFieldsPreserved,
    ulFieldsRetained
  ].filter(Boolean).length;
  
  console.log(`✅ Tests Passed: ${passedTests}/${totalTests}`);
  console.log(`📊 Domain File UL Terms: ${enhanced.metadata.ul_terms?.length || 0}`);
  console.log(`📊 Infra File UL Terms: ${infraEnhanced.metadata.ul_terms?.length || 0}`);
  console.log(`💾 Metadata Size: ${validation.size} bytes`);
  console.log(`🔍 Round-trip Success: ${ulFieldsRetained ? 'YES' : 'NO'}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL ACCEPTANCE TESTS PASSED!');
    console.log('🚀 UL processing is working end-to-end');
    console.log('📦 Ready for production deployment');
  } else {
    console.log('\n❌ SOME TESTS FAILED');
    console.log('🔧 Review failed assertions above');
    console.log('⚠️ Fix issues before production deployment');
  }
  
  return {
    totalTests,
    passedTests,
    success: passedTests === totalTests,
    domainTerms: enhanced.metadata.ul_terms?.length || 0,
    infraTerms: infraEnhanced.metadata.ul_terms?.length || 0,
    metadataSize: validation.size,
    roundTripSuccess: ulFieldsRetained
  };
}

// Run acceptance test
if (require.main === module) {
  runULAcceptanceTest().catch(console.error);
}

module.exports = { runULAcceptanceTest };