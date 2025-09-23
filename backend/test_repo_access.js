#!/usr/bin/env node

// test_repo_access.js - Test accessing repository content
console.log('🔍 Testing Repository Content Access...');

require('dotenv').config();

async function testRepoAccess() {
    try {
        const VectorSearchOrchestrator = require('./business_modules/ai/infrastructure/ai/rag_pipelines/query/vectorSearchOrchestrator');
        const { OpenAIEmbeddings } = require('@langchain/openai');
        
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            model: 'text-embedding-3-large'
        });
        
        const orchestrator = new VectorSearchOrchestrator({
            embeddings: embeddings
        });
        
        const testQuery = 'event driven design eventstorm app';
        console.log('🔍 Testing query:', testQuery);
        
        // Test user namespace (has test content)
        console.log('\n1️⃣ Testing user namespace...');
        const userResults = await orchestrator.searchSimilar(testQuery, {
            namespace: 'd41402df-182a-41ec-8f05-153118bf2718',
            topK: 3,
            threshold: 0.2,
            includeMetadata: true
        });
        
        console.log('📊 User namespace results:', userResults.matches?.length || 0);
        
        // Test repository namespace (should have actual code)
        console.log('\n2️⃣ Testing repository namespace...');
        const repoResults = await orchestrator.searchSimilar(testQuery, {
            namespace: 'anatolyzader_vc-3_main',
            topK: 5,
            threshold: 0.1,
            includeMetadata: true
        });
        
        console.log('📊 Repository namespace results:', repoResults.matches?.length || 0);
        if (repoResults.matches && repoResults.matches.length > 0) {
            repoResults.matches.forEach((match, i) => {
                console.log(`\n🎯 Repo Match ${i + 1}:`);
                console.log('  - Score:', match.score);
                console.log('  - Source:', match.metadata?.source || 'unknown');
                console.log('  - Text preview:', match.metadata?.text?.substring(0, 100) + '...');
            });
        }
        
        // Test global search (no namespace)
        console.log('\n3️⃣ Testing global search...');
        const globalResults = await orchestrator.searchSimilar(testQuery, {
            topK: 5,
            threshold: 0.1,
            includeMetadata: true
        });
        
        console.log('📊 Global search results:', globalResults.matches?.length || 0);
        if (globalResults.matches && globalResults.matches.length > 0) {
            globalResults.matches.forEach((match, i) => {
                console.log(`\n🌐 Global Match ${i + 1}:`);
                console.log('  - Score:', match.score);
                console.log('  - Source:', match.metadata?.source || 'unknown');
                console.log('  - Text preview:', match.metadata?.text?.substring(0, 100) + '...');
            });
        }
        
    } catch (error) {
        console.error('❌ Error testing repository access:', error.message);
        console.error('Stack:', error.stack);
    }
}

testRepoAccess();