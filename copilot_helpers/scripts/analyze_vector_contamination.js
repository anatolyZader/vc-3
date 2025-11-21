// Comprehensive analysis of vector database contamination
// This script helps identify why AI retrieves trace/test documents instead of actual code

// Use the actual Pinecone import available in this project (matching pineconePlugin.js)
const { Pinecone } = require('@pinecone-database/pinecone');

async function analyzeVectorContamination() {
  console.log('🔬 VECTOR DATABASE CONTAMINATION ANALYSIS');
  console.log('=' .repeat(70));
  
  // Check if we have API key
  if (!process.env.PINECONE_API_KEY) {
    console.log('❌ PINECONE_API_KEY not set locally');
    console.log('💡 This analysis needs to be run in production environment');
    console.log('🌐 Production environment: Cloud Run with environment variables');
    return;
  }
  
  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    
    const indexName = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
    const index = pinecone.index(indexName);
    const namespace = 'd41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3';
    
    console.log(`📊 Analyzing index: ${indexName}`);
    console.log(`🏷️ Namespace: ${namespace}`);
    
    // Get index statistics
    const stats = await index.describeIndexStats();
    console.log(`\n📈 Index Statistics:`);
    console.log(`   Total vectors: ${stats.totalVectorCount}`);
    console.log(`   Target namespace vectors: ${stats.namespaces?.[namespace]?.vectorCount || 0}`);
    
    // Sample different types of queries to understand contamination
    const testQueries = [
      { 
        name: "Dependency Injection Query",
        vector: new Array(3072).fill(0.1), // DI-related semantic vector
        description: "Should find DI-related code, not traces"
      },
      {
        name: "Generic Code Query", 
        vector: new Array(3072).fill(0.2), // Generic code vector
        description: "Should find actual repository code"
      },
      {
        name: "Random Vector",
        vector: Array.from({length: 3072}, () => Math.random() * 0.1),
        description: "Random sampling of database content"
      }
    ];
    
    for (const testQuery of testQueries) {
      console.log(`\n🔍 Testing: ${testQuery.name}`);
      console.log(`   Purpose: ${testQuery.description}`);
      
      try {
        const results = await index.query({
          namespace: namespace,
          vector: testQuery.vector,
          topK: 10,
          includeMetadata: true
        });
        
        console.log(`   📊 Found ${results.matches?.length || 0} results`);
        
        // Analyze the content types
        const contentTypes = {};
        const sources = {};
        
        results.matches?.forEach(match => {
          const source = match.metadata?.source || 'unknown';
          const type = match.metadata?.type || 'unknown';
          
          // Categorize by source type
          if (source.includes('trace') || source.includes('langsmith')) {
            sources['trace'] = (sources['trace'] || 0) + 1;
          } else if (source.includes('test') || source.includes('__test')) {
            sources['test'] = (sources['test'] || 0) + 1;
          } else if (source.includes('.js') || source.includes('.ts')) {
            sources['code'] = (sources['code'] || 0) + 1;
          } else {
            sources['other'] = (sources['other'] || 0) + 1;
          }
          
          // Categorize by metadata type
          contentTypes[type] = (contentTypes[type] || 0) + 1;
        });
        
        console.log(`   📂 Source Distribution:`);
        Object.entries(sources).forEach(([type, count]) => {
          const percentage = ((count / results.matches.length) * 100).toFixed(1);
          console.log(`      ${type}: ${count} (${percentage}%)`);
        });
        
        console.log(`   🏷️ Type Distribution:`);
        Object.entries(contentTypes).forEach(([type, count]) => {
          const percentage = ((count / results.matches.length) * 100).toFixed(1);
          console.log(`      ${type}: ${count} (${percentage}%)`);
        });
        
        // Show sample problematic results
        const problematicResults = results.matches?.filter(match => {
          const source = match.metadata?.source || '';
          return source.includes('trace') || source.includes('langsmith') || source.includes('test');
        });
        
        if (problematicResults && problematicResults.length > 0) {
          console.log(`   ⚠️ Problematic Results (${problematicResults.length}):`);
          problematicResults.slice(0, 3).forEach((match, i) => {
            console.log(`      ${i + 1}. ${match.id}`);
            console.log(`         Source: ${match.metadata?.source}`);
            console.log(`         Score: ${match.score?.toFixed(4)}`);
            console.log(`         Content: ${(match.metadata?.text || '').substring(0, 100)}...`);
          });
        }
        
      } catch (queryError) {
        console.log(`   ❌ Query failed: ${queryError.message}`);
      }
    }
    
    // Recommendations
    console.log(`\n💡 CONTAMINATION ANALYSIS COMPLETE`);
    console.log(`${'='.repeat(70)}`);
    console.log(`\n🎯 Findings:`);
    console.log(`   • Vector database accessible with ${stats.totalVectorCount} total vectors`);
    console.log(`   • Target namespace contains ${stats.namespaces?.[namespace]?.vectorCount || 0} vectors`);
    console.log(`   • Analysis above shows content distribution`);
    
    console.log(`\n🔧 Recommendations:`);
    console.log(`   1. Run this script in production environment to see actual contamination`);
    console.log(`   2. Check if trace documents have higher similarity scores than code`);
    console.log(`   3. Consider namespace cleanup if trace contamination is confirmed`);
    console.log(`   4. Verify AI query embeddings match repository code semantics`);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

// Also provide production testing script
console.log('📋 PRODUCTION TESTING INSTRUCTIONS:');
console.log('=' .repeat(70));
console.log(`
To test AI contamination in production:

1. Use this curl command to test AI responses:
   curl -X POST https://eventstorm.me/api/ai/respond \\
     -H "Content-Type: application/json" \\
     -H "Authorization: Bearer YOUR_TOKEN" \\
     -d '{"prompt": "explain the usage of di in eventstorm.me app in details"}'

2. Check if response contains:
   ✅ Actual DI code from diPlugin.js, containerResolver.js
   ❌ LangSmith trace data or test files

3. If contaminated, run vector cleanup:
   - Deploy this contamination analysis to Cloud Run
   - Identify problematic vector IDs
   - Clean namespace selectively

Current status: Local environment cannot access Pinecone
Next step: Test in production environment
`);

analyzeVectorContamination().catch(console.error);