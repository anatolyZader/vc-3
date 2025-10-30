/**
 * Debug script to check what's indexed in Pinecone for the AI module
 * This will help us understand why vector search returns 0 results
 */

const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

async function debugPineconeIndex() {
  console.log('🔍 Starting Pinecone Index Debug...\n');
  
  try {
    // Initialize Pinecone
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    
    const indexName = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
    const namespace = 'd41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3';
    
    console.log(`📊 Index: ${indexName}`);
    console.log(`📦 Namespace: ${namespace}\n`);
    
    const index = pinecone.index(indexName);
    
    // Get index stats
    console.log('📈 Fetching index stats...');
    const stats = await index.describeIndexStats();
    console.log('Index Stats:', JSON.stringify(stats, null, 2));
    
    // Check namespace stats
    if (stats.namespaces && stats.namespaces[namespace]) {
      const namespaceStats = stats.namespaces[namespace];
      console.log(`\n✅ Namespace exists with ${namespaceStats.vectorCount} vectors`);
    } else {
      console.log(`\n❌ Namespace ${namespace} not found!`);
      console.log('Available namespaces:', Object.keys(stats.namespaces || {}));
      return;
    }
    
    // Try to query for AI module files
    console.log('\n🔍 Searching for AI module files...\n');
    
    // Create a simple query vector (zeros - this will match by metadata only)
    const dimension = 3072; // text-embedding-3-large dimension
    const queryVector = new Array(dimension).fill(0);
    
    // Query 1: Sample to see what metadata fields are available
    console.log('Query 1: Sample vectors to inspect metadata structure');
    const query1 = await index.namespace(namespace).query({
      vector: queryVector,
      topK: 5,
      includeMetadata: true
    });
    
    if (query1.matches && query1.matches.length > 0) {
      console.log(`✅ Found ${query1.matches.length} sample matches:`);
      query1.matches.forEach((match, idx) => {
        console.log(`\n  Match ${idx + 1}:`);
        console.log(`    All metadata keys:`, Object.keys(match.metadata || {}));
        console.log(`    Source: ${match.metadata?.source || 'Unknown'}`);
        console.log(`    Type: ${match.metadata?.type || 'Unknown'}`);
        console.log(`    File Type: ${match.metadata?.fileType || 'N/A'}`);
      });
    } else {
      console.log('❌ No matches found');
    }
    
    // Query 2: Try to find files with type github-code
    console.log('\n\nQuery 2: Files with type=github-code');
    const query2 = await index.namespace(namespace).query({
      vector: queryVector,
      topK: 10,
      includeMetadata: true,
      filter: {
        type: { $eq: 'github-code' }
      }
    });
    
    if (query2.matches && query2.matches.length > 0) {
      console.log(`✅ Found ${query2.matches.length} github-code matches:`);
      query2.matches.slice(0, 5).forEach(match => {
        console.log(`  - ${match.metadata?.source || 'Unknown'}`);
        console.log(`    Text preview: ${(match.metadata?.text || '').substring(0, 100)}...`);
      });
    } else {
      console.log('❌ No github-code matches found');
    }
    
    // Query 3: Sample some random vectors to see what's indexed
    console.log('\n\nQuery 3: Random sample of indexed content (no filter)');
    const query3 = await index.namespace(namespace).query({
      vector: queryVector,
      topK: 10,
      includeMetadata: true
    });
    
    if (query3.matches && query3.matches.length > 0) {
      console.log(`✅ Found ${query3.matches.length} matches:`);
      query3.matches.forEach((match, idx) => {
        console.log(`\n  Match ${idx + 1}:`);
        console.log(`    ID: ${match.id}`);
        console.log(`    Source: ${match.metadata?.source || 'Unknown'}`);
        console.log(`    Type: ${match.metadata?.type || 'Unknown'}`);
        console.log(`    File Type: ${match.metadata?.fileType || 'N/A'}`);
        console.log(`    Text: ${(match.metadata?.text || '').substring(0, 150)}...`);
      });
    } else {
      console.log('❌ No matches found');
    }
    
    // Query 4: Search using actual embedding for "context pipeline query pipeline"
    console.log('\n\nQuery 4: Semantic search for "context pipeline query pipeline"');
    const { OpenAIEmbeddings } = require('@langchain/openai');
    const embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-large',
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const searchQuery = "explain the difference between context and query pipelines in ai module";
    console.log(`Query: "${searchQuery}"`);
    
    const queryEmbedding = await embeddings.embedQuery(searchQuery);
    console.log(`Generated embedding with ${queryEmbedding.length} dimensions`);
    
    // Search without filters first
    console.log('\n  a) Search WITHOUT filters:');
    const semanticQuery1 = await index.namespace(namespace).query({
      vector: queryEmbedding,
      topK: 10,
      includeMetadata: true
    });
    
    if (semanticQuery1.matches && semanticQuery1.matches.length > 0) {
      console.log(`  ✅ Found ${semanticQuery1.matches.length} matches (no filter):`);
      semanticQuery1.matches.forEach((match, idx) => {
        console.log(`\n    ${idx + 1}. Score: ${match.score?.toFixed(4)}`);
        console.log(`       Source: ${match.metadata?.source || 'Unknown'}`);
        console.log(`       Type: ${match.metadata?.type || 'Unknown'}`);
        console.log(`       Text: ${(match.metadata?.text || '').substring(0, 150)}...`);
      });
    } else {
      console.log('  ❌ No matches found (no filter)');
    }
    
    // Search with the same filters used in queryPipeline
    console.log('\n  b) Search WITH AI module filters (like in queryPipeline):');
    const aiModuleFilter = {
      $or: [
        { type: { $eq: 'github-code' } },
        { type: { $eq: 'module_documentation' } }
      ]
    };
    
    const semanticQuery2 = await index.namespace(namespace).query({
      vector: queryEmbedding,
      topK: 23,
      includeMetadata: true,
      filter: aiModuleFilter
    });
    
    if (semanticQuery2.matches && semanticQuery2.matches.length > 0) {
      console.log(`  ✅ Found ${semanticQuery2.matches.length} matches (WITH filter):`);
      semanticQuery2.matches.forEach((match, idx) => {
        console.log(`\n    ${idx + 1}. Score: ${match.score?.toFixed(4)}`);
        console.log(`       Source: ${match.metadata?.source || 'Unknown'}`);
        console.log(`       Type: ${match.metadata?.type || 'Unknown'}`);
        console.log(`       Text: ${(match.metadata?.text || '').substring(0, 150)}...`);
      });
    } else {
      console.log('  ❌ No matches found (WITH filter)');
      console.log('  This explains why your query returned 0 results!');
    }
    
    console.log('\n\n✅ Debug complete!');
    
  } catch (error) {
    console.error('❌ Error during debug:', error.message);
    console.error(error);
  }
}

// Run the debug
debugPineconeIndex();
