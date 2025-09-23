#!/usr/bin/env node

/**
 * Simple Repository Reindexing Script
 * Uses the existing AILangchainAdapter to reindex the repository
 */

require('dotenv').config();

async function reindexRepository() {
    console.log('🔄 REINDEXING REPOSITORY FOR RAG');
    console.log('================================');
    
    try {
        // Import the AI adapter
        const AILangchainAdapter = require('./business_modules/ai/infrastructure/ai/aiLangchainAdapter');
        
        // Create adapter instance (it handles all dependencies internally)
        console.log('🔧 Initializing AI adapter...');
        const adapter = new AILangchainAdapter({});
        
        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Repository information
        const userId = 'anatolyZader'; // Use the actual GitHub username 
        const repoId = 'anatolyZader/vc-3';
        const repoData = {
            url: 'https://github.com/anatolyZader/vc-3',
            branch: 'main',
            githubOwner: 'anatolyZader',
            repoName: 'vc-3',
            description: 'EventStorm repository - manual reindexing',
            timestamp: new Date().toISOString(),
            source: 'manual-reindex'
        };
        
        console.log(`📦 Processing repository: ${repoId}`);
        console.log(`🌿 Branch: ${repoData.branch}`);
        console.log(`👤 User: ${userId}`);
        console.log('');
        
        console.log('🔄 Starting repository processing...');
        console.log('⏱️  This may take several minutes...');
        
        const startTime = Date.now();
        const result = await adapter.processPushedRepo(userId, repoId, repoData);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log('');
        if (result.success) {
            console.log('✅ REPOSITORY REINDEXING COMPLETED!');
            console.log('===================================');
            console.log(`📊 Result: ${JSON.stringify(result, null, 2)}`);
            console.log(`⏱️  Processing time: ${duration}s`);
            console.log('');
            console.log('🎯 NEXT STEPS:');
            console.log('1. ✅ Vector store should now be populated with repository content');
            console.log('2. 🧪 Test RAG queries in your chat interface');
            console.log('3. 🔍 Ask: "How is event driven design implemented in eventstorm.me app?"');
            console.log('4. 🚀 Should get detailed responses about your actual codebase!');
        } else {
            console.error('❌ REPOSITORY REINDEXING FAILED:', result.error);
            process.exit(1);
        }
        
    } catch (error) {
        console.error('💥 ERROR during repository reindexing:', error.message);
        console.error('📋 Stack trace:', error.stack);
        process.exit(1);
    }
}

reindexRepository();