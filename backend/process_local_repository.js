#!/usr/bin/env node

/**
 * Local repository processing script - bypasses GitHub API rate limits
 * by processing the local git repository files directly
 */

require('dotenv').config();
const path = require('path');
const { DataPreparationPipeline } = require('./src/domain/entities/DataPreparationPipeline');

async function processLocalRepository() {
    console.log('🔄 Starting local repository processing...');
    
    try {
        const pipeline = new DataPreparationPipeline();
        
        // Process the local repository
        const repositoryPath = path.resolve(__dirname, '../');
        console.log(`📁 Processing repository at: ${repositoryPath}`);
        
        // Use local file processing instead of GitHub API
        const result = await pipeline.processLocalRepository(repositoryPath);
        
        console.log('✅ Local processing completed:', result);
        
    } catch (error) {
        console.error('❌ Processing failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

processLocalRepository();