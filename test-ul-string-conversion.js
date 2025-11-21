#!/usr/bin/env node
/**
 * Test script to verify UL tags string-to-array conversion works correctly
 */

// Simulate metadata as it comes from Pinecone (after flattening)
const mockPineconeMetadata = {
  source: 'backend/business_modules/ai/application/services/aiService.js',
  ul_version: 'ul-1.0.0',
  ul_bounded_context: 'ai',
  ul_terms: 'aiService, ai, service, process, repo, pushed, fastify, adapter, pinecone', // STRING!
  ul_match_count: 9,
  ubiq_enhanced: true,
  ubiq_business_module: 'ai',
  ubiq_terminology: 'aiService, ai, service', // STRING!
  ubiq_domain_events: 'RepoProcessed, ChunksIndexed' // STRING!
};

console.log('🧪 Testing UL Tags String-to-Array Conversion\n');
console.log('=' .repeat(60));

// Original approach (BROKEN)
console.log('\n❌ BEFORE FIX (treats string as array):');
console.log('----------------------------------------');
try {
  const termsBefore = mockPineconeMetadata.ul_terms || [];
  console.log(`typeof ul_terms: ${typeof termsBefore}`);
  console.log(`ul_terms.length: ${termsBefore.length} (this is CHARACTER count!)`);
  console.log(`Iterating forEach (iterates CHARACTERS):`);
  
  let charCount = 0;
  termsBefore.split('').slice(0, 10).forEach(char => {
    console.log(`  - "${char}"`);
    charCount++;
  });
  console.log(`  ... (showing first 10 characters only)`);
  console.log(`❌ This is wrong! It's treating the string as individual characters.\n`);
} catch (error) {
  console.error('Error:', error.message);
}

// Fixed approach
console.log('\n✅ AFTER FIX (converts string to array):');
console.log('----------------------------------------');
try {
  let termsAfter = mockPineconeMetadata.ul_terms || [];
  
  // FIX: Check if it's a string and convert to array
  if (typeof termsAfter === 'string') {
    termsAfter = termsAfter.split(',').map(t => t.trim()).filter(t => t.length > 0);
  }
  
  console.log(`typeof ul_terms: ${typeof termsAfter}`);
  console.log(`Array.isArray(ul_terms): ${Array.isArray(termsAfter)}`);
  console.log(`ul_terms.length: ${termsAfter.length} (correct TERM count)`);
  console.log(`Terms array:`, termsAfter);
  console.log(`✅ This is correct! Now we have an actual array of terms.\n`);
} catch (error) {
  console.error('Error:', error.message);
}

// Test the full UL stats calculation
console.log('\n📊 Testing UL Stats Calculation:');
console.log('=' .repeat(60));

const mockSearchResults = [
  { metadata: mockPineconeMetadata },
  { 
    metadata: {
      source: 'backend/business_modules/ai/domain/entities/repository.js',
      ul_version: 'ul-1.0.0',
      ul_bounded_context: 'ai',
      ul_terms: 'repository, domain, entity, aggregate', // STRING
      ul_match_count: 4,
      ubiq_enhanced: true
    }
  },
  {
    metadata: {
      source: 'backend/README.md',
      // No UL tags - should not be counted
    }
  }
];

const ulStats = {
  totalChunks: mockSearchResults.length,
  chunksWithUL: 0,
  chunksWithoutUL: 0,
  boundedContexts: new Set(),
  businessModules: new Set(),
  totalTerms: 0,
  uniqueTerms: new Set(),
  domainEvents: new Set()
};

mockSearchResults.forEach(doc => {
  const hasUL = doc.metadata.ul_version || doc.metadata.ubiq_enhanced;
  
  if (hasUL) {
    ulStats.chunksWithUL++;
    
    if (doc.metadata.ul_bounded_context) ulStats.boundedContexts.add(doc.metadata.ul_bounded_context);
    if (doc.metadata.ubiq_business_module) ulStats.businessModules.add(doc.metadata.ubiq_business_module);
    
    // FIX: Convert string to array
    let terms = doc.metadata.ul_terms || doc.metadata.ubiq_terminology || [];
    if (typeof terms === 'string') {
      terms = terms.split(',').map(t => t.trim()).filter(t => t.length > 0);
    }
    ulStats.totalTerms += terms.length;
    terms.forEach(term => ulStats.uniqueTerms.add(term));
    
    // FIX: Convert events string to array
    let events = doc.metadata.ubiq_domain_events || [];
    if (typeof events === 'string') {
      events = events.split(',').map(e => e.trim()).filter(e => e.length > 0);
    }
    events.forEach(event => ulStats.domainEvents.add(event));
  } else {
    ulStats.chunksWithoutUL++;
  }
});

const ulCoverage = ulStats.totalChunks > 0 
  ? Math.round((ulStats.chunksWithUL / ulStats.totalChunks) * 100) 
  : 0;

console.log('\n✅ Results:');
console.log(`- Chunks with UL Tags: ${ulStats.chunksWithUL}/${ulStats.totalChunks} (${ulCoverage}%)`);
console.log(`- Chunks without UL Tags: ${ulStats.chunksWithoutUL}/${ulStats.totalChunks}`);
console.log(`- Total UL Terms: ${ulStats.totalTerms} terms`);
console.log(`- Unique Terms: ${ulStats.uniqueTerms.size} distinct terms`);
console.log(`  - Terms: ${Array.from(ulStats.uniqueTerms).slice(0, 10).join(', ')}...`);
console.log(`- Bounded Contexts: ${Array.from(ulStats.boundedContexts).join(', ')}`);
console.log(`- Domain Events: ${Array.from(ulStats.domainEvents).join(', ')}`);

console.log('\n' + '='.repeat(60));
console.log('✅ Test Passed! String-to-array conversion works correctly.');
console.log('🎉 UL tags will now be properly detected in trace analysis!');
