require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');

async function testVectorSearch() {
  try {
    console.log('🔍 Testing vector search functionality...');
    
    // Initialize Pinecone
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index('eventstorm-index');
    
    // Initialize embeddings
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY
    });
    
    // Test query similar to what user asked
    const testQuery = "how is event driven design implemented in eventstorm.me app?";
    console.log(`📝 Query: "${testQuery}"`);
    
    // Generate embedding
    console.log('🧠 Generating embedding...');
    const queryEmbedding = await embeddings.embedQuery(testQuery);
    console.log('✅ Embedding generated, length:', queryEmbedding.length);
    
    // Search in user namespace
    const userNamespace = 'd41402df-182a-41ec-8f05-153118bf2718';
    console.log('🔍 Searching in namespace:', userNamespace);
    
    const searchResults = await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true,
      namespace: userNamespace
    });
    
    console.log('📊 Search results:', {
      totalMatches: searchResults.matches?.length || 0,
      scores: searchResults.matches?.map(m => m.score.toFixed(3)) || []
    });
    
    if (searchResults.matches && searchResults.matches.length > 0) {
      console.log('✅ Found relevant documents!');
      searchResults.matches.forEach((match, i) => {
        console.log(`\n📄 Result ${i + 1}:`);
        console.log(`   Score: ${match.score.toFixed(3)}`);
        console.log(`   Source: ${match.metadata?.source || 'Unknown'}`);
        console.log(`   Type: ${match.metadata?.type || 'Unknown'}`);
        console.log(`   Content: ${(match.metadata?.text || match.metadata?.content || '').substring(0, 150)}...`);
      });
    } else {
      console.log('❌ No documents found - this explains why RAG is not working!');
      
      // Check if there are any vectors in the namespace
      const stats = await index.describeIndexStats();
      console.log('\n📊 Namespace stats:', stats.namespaces);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testVectorSearch();