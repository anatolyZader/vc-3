#!/usr/bin/env node

// test_rag_debug.js - Debug RAG vector retrieval
console.log('🔍 Testing RAG Vector Retrieval...');

require('dotenv').config();

const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');

async function testVectorRetrieval() {
    try {
        console.log('📊 Checking environment...');
        console.log('PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? 'Set' : 'Missing');
        console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Missing');

        // Initialize Pinecone
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });

        const index = pinecone.index('eventstorm-index');
        console.log('✅ Connected to Pinecone index');

        // Test embedding generation
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            model: 'text-embedding-3-large'  // 3072 dimensions
        });

        const testQuery = 'how is event driven design implemented in eventstorm.me app?';
        console.log('🔍 Generating embedding for query:', testQuery);
        
        const queryEmbedding = await embeddings.embedQuery(testQuery);
        console.log('✅ Generated embedding, dimension:', queryEmbedding.length);

        // Test vector search with user namespace
        const userId = 'd41402df-182a-41ec-8f05-153118bf2718';
        console.log('🎯 Testing vector search in namespace:', userId);

        const searchResults = await index.namespace(userId).query({
            vector: queryEmbedding,
            topK: 5,
            includeMetadata: true,
            includeValues: false
        });

        console.log('📊 Search Results:');
        console.log('- Matches found:', searchResults.matches?.length || 0);
        
        if (searchResults.matches && searchResults.matches.length > 0) {
            searchResults.matches.forEach((match, i) => {
                console.log(`\n🎯 Match ${i + 1}:`);
                console.log('  - Score:', match.score);
                console.log('  - ID:', match.id);
                console.log('  - Metadata:', JSON.stringify(match.metadata, null, 2));
            });
        } else {
            console.log('❌ No matches found in user namespace');
            
            // Try searching without namespace
            console.log('\n🔍 Testing search without namespace...');
            const globalResults = await index.query({
                vector: queryEmbedding,
                topK: 5,
                includeMetadata: true,
                includeValues: false
            });
            
            console.log('📊 Global Search Results:');
            console.log('- Matches found:', globalResults.matches?.length || 0);
            
            if (globalResults.matches && globalResults.matches.length > 0) {
                globalResults.matches.forEach((match, i) => {
                    console.log(`\n🎯 Global Match ${i + 1}:`);
                    console.log('  - Score:', match.score);
                    console.log('  - ID:', match.id);
                    console.log('  - Metadata:', JSON.stringify(match.metadata, null, 2));
                });
            }
        }

        // Check namespace stats
        console.log('\n📈 Checking namespace stats...');
        const namespaceStats = await index.describeIndexStats();
        console.log('Index stats:', JSON.stringify(namespaceStats, null, 2));

    } catch (error) {
        console.error('❌ Error during vector retrieval test:', error);
        console.error('Stack:', error.stack);
    }
}

testVectorRetrieval();