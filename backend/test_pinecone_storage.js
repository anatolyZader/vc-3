#!/usr/bin/env node

/**
 * Test Pinecone Vector Storage
 * Verify that we can actually store vectors in Pinecone
 */

require('dotenv').config();
const { OpenAIEmbeddings } = require('@langchain/openai');
const { PineconeStore } = require('@langchain/pinecone');
const { Pinecone } = require('@pinecone-database/pinecone');

async function testPineconeStorage() {
  console.log('🧪 TESTING PINECONE VECTOR STORAGE');
  console.log('==================================');
  
  try {
    // Initialize Pinecone
    console.log('🔧 Initializing Pinecone client...');
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    // Get index
    const indexName = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
    const index = pinecone.index(indexName);
    
    console.log(`📊 Connected to index: ${indexName}`);
    
    // Initialize embeddings
    console.log('🔧 Initializing OpenAI embeddings...');
    const embeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'text-embedding-3-large'
    });
    
    // Initialize vector store with user namespace
    const userId = 'd41402df-182a-41ec-8f05-153118bf2718';
    console.log(`📁 Creating vector store for user: ${userId}`);
    
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
      namespace: userId,
    });
    
    console.log('✅ Vector store initialized successfully');
    
    // Test document storage
    console.log('📝 Testing document storage...');
    const testDocuments = [
      {
        pageContent: 'This is a test document for the chat module in EventStorm.',
        metadata: {
          source: 'test-chat-module.js',
          type: 'test',
          timestamp: new Date().toISOString()
        }
      },
      {
        pageContent: 'The EventStorm chat module provides real-time messaging capabilities.',
        metadata: {
          source: 'test-chat-features.md',
          type: 'documentation',
          timestamp: new Date().toISOString()
        }
      }
    ];
    
    // Store test documents
    await vectorStore.addDocuments(testDocuments);
    console.log(`✅ Stored ${testDocuments.length} test documents`);
    
    // Test retrieval
    console.log('🔍 Testing document retrieval...');
    const searchResults = await vectorStore.similaritySearch('chat module', 5);
    
    console.log(`📊 Retrieved ${searchResults.length} documents:`);
    searchResults.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.metadata.source}: ${doc.pageContent.substring(0, 100)}...`);
    });
    
    // Check index stats
    console.log('📈 Checking index statistics...');
    const stats = await index.describeIndexStats();
    console.log(`📊 Total vectors: ${stats.totalRecordCount || 0}`);
    console.log(`📁 Namespaces: ${Object.keys(stats.namespaces || {}).length}`);
    
    if (stats.namespaces && stats.namespaces[userId]) {
      console.log(`👤 User namespace (${userId}): ${stats.namespaces[userId].recordCount} records`);
    }
    
    console.log('');
    console.log('✅ PINECONE STORAGE TEST SUCCESSFUL!');
    console.log('🎯 Vector store is working correctly');
    
  } catch (error) {
    console.error('❌ PINECONE STORAGE TEST FAILED:', error.message);
    console.error('📋 Full error:', error);
    process.exit(1);
  }
}

testPineconeStorage();