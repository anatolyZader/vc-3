#!/usr/bin/env node

/**
 * Debug script to test vector search thresholds
 * This script will help identify why documents are being filtered out
 */

require('dotenv').config();
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Pinecone } = require('@pinecone-database/pinecone');

async function debugVectorThreshold() {
    try {
        console.log('🔍 Testing vector search thresholds...');
        
        // Initialize Pinecone
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY
        });
        
        const index = pinecone.index('eventstorm-index');
        const namespace = 'd41402df-182a-41ec-8f05-153118bf2718';
        
        // Initialize embeddings
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: 'text-embedding-3-large',
            dimensions: 3072
        });
        
        // Test query
        const query = "How is event-driven design implemented in eventstorm.me app?";
        console.log(`📝 Query: "${query}"`);
        
        // Generate embedding
        console.log('🔄 Generating query embedding...');
        const queryEmbedding = await embeddings.embedQuery(query);
        console.log(`✅ Generated embedding with ${queryEmbedding.length} dimensions`);
        
        // Search with different configurations
        const searches = [
            { topK: 10, includeMetadata: true, includeValues: false },
            { topK: 5, includeMetadata: true, includeValues: false },
            { topK: 3, includeMetadata: true, includeValues: false }
        ];
        
        for (const searchConfig of searches) {
            console.log(`\n🔍 Searching with topK=${searchConfig.topK}...`);
            
            const searchResponse = await index.namespace(namespace).query({
                vector: queryEmbedding,
                ...searchConfig
            });
            
            console.log(`📊 Found ${searchResponse.matches?.length || 0} matches`);
            
            if (searchResponse.matches && searchResponse.matches.length > 0) {
                searchResponse.matches.forEach((match, i) => {
                    console.log(`\n📄 Match ${i + 1}:`);
                    console.log(`   ID: ${match.id}`);
                    console.log(`   Score: ${match.score.toFixed(4)}`);
                    console.log(`   Metadata:`, JSON.stringify(match.metadata, null, 2));
                    
                    // Test different thresholds
                    const thresholds = [0.9, 0.8, 0.7, 0.6, 0.5];
                    const passedThresholds = thresholds.filter(t => match.score >= t);
                    console.log(`   Passes thresholds: ${passedThresholds.join(', ')}`);
                });
            }
        }
        
        // Test with global namespace (no namespace specified)
        console.log(`\n🌐 Testing global search (no namespace)...`);
        const globalSearchResponse = await index.query({
            vector: queryEmbedding,
            topK: 10,
            includeMetadata: true,
            includeValues: false
        });
        
        console.log(`📊 Global search found ${globalSearchResponse.matches?.length || 0} matches`);
        
        if (globalSearchResponse.matches && globalSearchResponse.matches.length > 0) {
            globalSearchResponse.matches.forEach((match, i) => {
                console.log(`\n📄 Global Match ${i + 1}:`);
                console.log(`   ID: ${match.id}`);
                console.log(`   Score: ${match.score.toFixed(4)}`);
                console.log(`   Metadata:`, JSON.stringify(match.metadata, null, 2));
            });
        }
        
        // Test repository namespace
        console.log(`\n🏛️ Testing repository namespace...`);
        const repoNamespace = 'repository';
        const repoSearchResponse = await index.namespace(repoNamespace).query({
            vector: queryEmbedding,
            topK: 10,
            includeMetadata: true,
            includeValues: false
        });
        
        console.log(`📊 Repository search found ${repoSearchResponse.matches?.length || 0} matches`);
        
        if (repoSearchResponse.matches && repoSearchResponse.matches.length > 0) {
            repoSearchResponse.matches.forEach((match, i) => {
                console.log(`\n📄 Repository Match ${i + 1}:`);
                console.log(`   ID: ${match.id}`);
                console.log(`   Score: ${match.score.toFixed(4)}`);
                console.log(`   Metadata:`, JSON.stringify(match.metadata, null, 2));
            });
        }
        
        console.log('\n✅ Vector threshold debugging complete');
        
    } catch (error) {
        console.error('❌ Error during vector threshold debugging:', error);
        console.error('Error details:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    }
}

// Run the debug
debugVectorThreshold().catch(console.error);