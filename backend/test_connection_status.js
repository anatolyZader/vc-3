#!/usr/bin/env node

// test_connection_status.js - Debug connection status
console.log('🔍 Testing Connection Status...');

require('dotenv').config();

async function testConnectionStatus() {
    try {
        // Test the actual vector search orchestrator
        const VectorSearchOrchestrator = require('./business_modules/ai/infrastructure/ai/rag_pipelines/query/vectorSearchOrchestrator');
        const { OpenAIEmbeddings } = require('@langchain/openai');
        
        console.log('🔧 Initializing VectorSearchOrchestrator...');
        
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            model: 'text-embedding-3-large'
        });
        
        const orchestrator = new VectorSearchOrchestrator({
            embeddings: embeddings,
            apiKey: process.env.PINECONE_API_KEY,
            indexName: 'eventstorm-index',
            region: 'us-central1',
            defaultTopK: 5,
            defaultThreshold: 0.7,
            maxResults: 50
        });
        
        console.log('✅ VectorSearchOrchestrator initialized');
        
        // Test connection status
        console.log('🔍 Testing connection status...');
        const isConnected = orchestrator.isConnected();
        console.log('📊 isConnected():', isConnected);
        
        // Try to perform a search to see if it works
        console.log('🔍 Testing vector search...');
        const testQuery = 'event driven design';
        
        try {
            const searchResults = await orchestrator.searchSimilar(testQuery, {
                namespace: 'd41402df-182a-41ec-8f05-153118bf2718', // User namespace
                topK: 3,
                threshold: 0.3,
                includeMetadata: true
            });
            
            console.log('📊 Search results:');
            console.log('- Matches found:', searchResults.matches?.length || 0);
            
            if (searchResults.matches && searchResults.matches.length > 0) {
                searchResults.matches.forEach((match, i) => {
                    console.log(`\n🎯 Match ${i + 1}:`);
                    console.log('  - Score:', match.score);
                    console.log('  - Source:', match.metadata?.source || 'unknown');
                    console.log('  - Text preview:', match.metadata?.text?.substring(0, 100) + '...');
                });
            }
            
            // After successful search, check connection status again
            const isConnectedAfter = orchestrator.isConnected();
            console.log('\n📊 isConnected() after search:', isConnectedAfter);
            
        } catch (searchError) {
            console.error('❌ Search failed:', searchError.message);
            console.log('🔍 Checking connection status after failed search...');
            const isConnectedAfterError = orchestrator.isConnected();
            console.log('📊 isConnected() after error:', isConnectedAfterError);
        }
        
    } catch (error) {
        console.error('❌ Error during connection test:', error.message);
        console.error('Stack:', error.stack);
    }
}

testConnectionStatus();