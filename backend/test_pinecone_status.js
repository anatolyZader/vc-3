require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function checkPinecone() {
  try {
    console.log('🔍 Checking Pinecone connection...');
    console.log('API Key present:', !!process.env.PINECONE_API_KEY);
    console.log('Index name:', process.env.PINECONE_INDEX_NAME);
    
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const indexes = await pc.listIndexes();
    console.log('📋 Available indexes:', indexes.indexes?.map(i => i.name) || []);
    
    if (indexes.indexes?.some(i => i.name === 'eventstorm-index')) {
      console.log('✅ eventstorm-index exists');
      const index = pc.index('eventstorm-index');
      const stats = await index.describeIndexStats();
      console.log('📊 Index stats:', {
        totalVectorCount: stats.totalVectorCount,
        dimension: stats.dimension,
        namespaces: Object.keys(stats.namespaces || {})
      });
      
      // Check specific user namespace
      if (stats.namespaces && stats.namespaces['d41402df-182a-41ec-8f05-153118bf2718']) {
        console.log('👤 User namespace found with', stats.namespaces['d41402df-182a-41ec-8f05-153118bf2718'].vectorCount, 'vectors');
      } else {
        console.log('❌ User namespace not found - this is why RAG is not working!');
      }
    } else {
      console.log('❌ eventstorm-index not found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPinecone();