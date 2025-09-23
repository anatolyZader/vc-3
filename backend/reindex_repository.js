#!/usr/bin/env node

/**
 * Simple Repository Reindexing Script
 * Uses the existing AILangchainAdapter to reindex the repository
 */

require('dotenv').config();

async function reindexRepository() {
    console.log('🔄 REINDEXING REPOSITORY FOR RAG');
    console.log('=================================');
    
    try {
        // Import the AI adapter
        const AILangchainAdapter = require('./business_modules/ai/infrastructure/ai/aiLangchainAdapter');
        
        console.log('🔧 Initializing AI adapter...');
        
        // Create adapter instance (it will initialize everything)
        const aiAdapter = new AILangchainAdapter({
            // Mock container cradle with minimal required properties
            openaiApiKey: process.env.OPENAI_API_KEY,
            pineconeApiKey: process.env.PINECONE_API_KEY,
            anthropicApiKey: process.env.ANTHROPIC_API_KEY,
            eventBus: { emit: () => {} }, // Mock event bus
            logger: console // Use console as logger
        });
        
        console.log('✅ AI adapter initialized');
        
        // Set user ID for the repository namespace
        const userId = 'anatolyzader_vc-3_main'; // Repository namespace
        console.log(`🎯 Setting user ID: ${userId}`);
        await aiAdapter.setUserId(userId);
        
        // Repository data
        const repoId = 'anatolyZader/vc-3';
        const repoData = {
            url: 'https://github.com/anatolyZader/vc-3',
            branch: 'main',
            githubOwner: 'anatolyZader',
            repoName: 'vc-3',
            description: 'EventStorm repository - reindexing for RAG',
            timestamp: new Date().toISOString(),
            source: 'manual-reindex'
        };
        
        console.log(`📦 Processing repository: ${repoId}`);
        console.log(`🌿 Branch: ${repoData.branch}`);
        console.log('');
        
        // Process the repository
        console.log('🔄 Starting repository processing...');
        const startTime = Date.now();
        
        const result = await aiAdapter.processPushedRepo(userId, repoId, repoData);
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        if (result && result.success !== false) {
            console.log('');
            console.log('✅ REPOSITORY REINDEXING COMPLETED!');
            console.log('====================================');
            console.log(`📊 Result:`, JSON.stringify(result, null, 2));
            console.log(`⏱️  Processing time: ${duration}s`);
            console.log(`📅 Processed at: ${new Date().toISOString()}`);
            console.log('');
            console.log('🎯 NEXT STEPS:');
            console.log('1. ✅ Repository should now be properly indexed');
            console.log('2. 🧪 Test RAG queries in your chat interface');
            console.log('3. 🔍 Should get contextual responses about EventStorm code');
            console.log('4. 🚀 Try asking: "How is event-driven design implemented in eventstorm.me app?"');
            
        } else {
            console.error('❌ REPOSITORY PROCESSING FAILED:', result?.error || 'Unknown error');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('💥 ERROR during repository reindexing:', error.message);
        console.error('📋 Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the reindexing
console.log('🚀 Starting repository reindexing...');
console.log('This will populate your vector database with actual code content.');
console.log('');

reindexRepository();