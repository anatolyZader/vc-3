// Vector database cleanup script - remove contaminated trace documents
// This script identifies and removes trace analysis documents that are polluting AI responses

const { Pinecone } = require('@pinecone-database/pinecone');

async function cleanContaminatedVectors() {
  console.log('🧹 VECTOR DATABASE CLEANUP - REMOVING CONTAMINATED TRACES');
  console.log('=' .repeat(70));
  
  if (!process.env.PINECONE_API_KEY) {
    console.log('❌ PINECONE_API_KEY not set');
    console.log('💡 This cleanup must be run in production environment');
    console.log('🌐 Add this script to your deployment pipeline');
    return;
  }
  
  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    
    const indexName = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
    const index = pinecone.index(indexName);
    const namespace = 'd41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3';
    
    console.log(`🎯 Target: ${indexName}/${namespace}`);
    
    // Get index stats before cleanup
    const statsBefore = await index.describeIndexStats();
    const vectorCountBefore = statsBefore.namespaces?.[namespace]?.vectorCount || 0;
    console.log(`📊 Vectors before cleanup: ${vectorCountBefore}`);
    
    // Sample vectors to identify contamination patterns
    console.log('\n🔍 SAMPLING VECTORS TO IDENTIFY CONTAMINATION...');
    const sampleQuery = await index.query({
      namespace: namespace,
      vector: new Array(3072).fill(0.1),
      topK: 50, // Get larger sample
      includeMetadata: true
    });
    
    const contaminatedIds = [];
    const cleanIds = [];
    
    sampleQuery.matches?.forEach(match => {
      const source = match.metadata?.source || '';
      const content = match.metadata?.text || '';
      
      // Identify contaminated vectors
      const isContaminated = (
        source.includes('trace') ||
        source.includes('langsmith') ||
        source.includes('test-chat') ||
        content.includes('ARCHIVED TRACE ANALYSIS') ||
        content.includes('LangSmith RAG Trace Analysis') ||
        content.includes('Trace ID: Not captured') ||
        content.includes('This is a test document')
      );
      
      if (isContaminated) {
        contaminatedIds.push({
          id: match.id,
          source: source,
          reason: 'trace/test contamination',
          score: match.score
        });
      } else {
        cleanIds.push({
          id: match.id,
          source: source,
          score: match.score
        });
      }
    });
    
    console.log(`\n📊 CONTAMINATION ANALYSIS:`);
    console.log(`   Contaminated vectors: ${contaminatedIds.length}`);
    console.log(`   Clean vectors: ${cleanIds.length}`);
    console.log(`   Sample size: ${sampleQuery.matches?.length || 0}`);
    
    if (contaminatedIds.length > 0) {
      console.log(`\n🚨 CONTAMINATED VECTORS FOUND:`);
      contaminatedIds.slice(0, 5).forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.id}`);
        console.log(`      Source: ${item.source}`);
        console.log(`      Reason: ${item.reason}`);
        console.log(`      Score: ${item.score?.toFixed(4)}`);
      });
      
      if (contaminatedIds.length > 5) {
        console.log(`   ... and ${contaminatedIds.length - 5} more contaminated vectors`);
      }
    }
    
    if (cleanIds.length > 0) {
      console.log(`\n✅ CLEAN VECTORS SAMPLE:`);
      cleanIds.slice(0, 3).forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.source} (score: ${item.score?.toFixed(4)})`);
      });
    }
    
    // Delete contaminated vectors if found
    if (contaminatedIds.length > 0) {
      console.log(`\n🗑️ DELETING ${contaminatedIds.length} CONTAMINATED VECTORS...`);
      
      // Delete in batches to avoid rate limits
      const batchSize = 100;
      for (let i = 0; i < contaminatedIds.length; i += batchSize) {
        const batch = contaminatedIds.slice(i, i + batchSize);
        const idsToDelete = batch.map(item => item.id);
        
        console.log(`   Deleting batch ${Math.floor(i/batchSize) + 1}: ${idsToDelete.length} vectors`);
        
        await index.deleteMany({
          namespace: namespace,
          ids: idsToDelete
        });
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`✅ Deleted ${contaminatedIds.length} contaminated vectors`);
    } else {
      console.log(`✅ No contaminated vectors found in sample`);
    }
    
    // Get stats after cleanup
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for index to update
    const statsAfter = await index.describeIndexStats();
    const vectorCountAfter = statsAfter.namespaces?.[namespace]?.vectorCount || 0;
    
    console.log(`\n📊 CLEANUP SUMMARY:`);
    console.log(`   Vectors before: ${vectorCountBefore}`);
    console.log(`   Vectors after: ${vectorCountAfter}`);
    console.log(`   Vectors removed: ${vectorCountBefore - vectorCountAfter}`);
    console.log(`   Contaminated identified: ${contaminatedIds.length}`);
    
    if (vectorCountAfter > 0) {
      console.log(`\n🧪 TESTING CLEANED DATABASE...`);
      const testQuery = await index.query({
        namespace: namespace,
        vector: new Array(3072).fill(0.1),
        topK: 5,
        includeMetadata: true
      });
      
      console.log(`   Test query returned ${testQuery.matches?.length || 0} results`);
      testQuery.matches?.slice(0, 3).forEach((match, i) => {
        console.log(`   ${i + 1}. ${match.metadata?.source} (score: ${match.score?.toFixed(4)})`);
      });
    }
    
    console.log(`\n✅ CLEANUP COMPLETE!`);
    console.log(`💡 Test the AI assistant now - it should return actual code instead of traces`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Instructions for running in production
console.log('🚀 VECTOR DATABASE CLEANUP INSTRUCTIONS');
console.log('=' .repeat(50));
console.log(`
To clean the contaminated vector database:

1. Add this script to your production environment
2. Set environment variables:
   - PINECONE_API_KEY
   - PINECONE_INDEX_NAME
   - PINECONE_REGION (us-central1)

3. Run the cleanup:
   node clean_contaminated_vectors.js

4. Test AI responses after cleanup

Expected result: AI should retrieve actual code files instead of trace analysis documents
`);

cleanContaminatedVectors().catch(console.error);