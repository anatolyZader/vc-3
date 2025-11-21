#!/usr/bin/env node

/**
 * Debug Query Pipeline Behavior
 * 
 * This script simulates the exact query that's failing to understand
 * why it's returning 10 identical OpenAPI schema documents.
 */

require('dotenv').config();

async function debugQueryPipelineBehavior() {
    console.log('🔍 DEBUGGING QUERY PIPELINE BEHAVIOR');
    console.log('=' .repeat(60));
    
    try {
        // Import the exact services used by the query pipeline
        const { OpenAIEmbeddings } = require('@langchain/openai');
        const PineconeService = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pineconeService');
        const PineconePlugin = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pineconePlugin');
        
        console.log('📦 Initializing services...');
        
        // Initialize services exactly as QueryPipeline does
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: 'text-embedding-3-large',
            dimensions: 3072
        });
        
        const pineconePlugin = new PineconePlugin();
        const pineconeService = new PineconeService({
            pineconePlugin: pineconePlugin,
            rateLimiter: null
        });
        
        // Use the exact namespace and query that's failing
        const namespace = 'd41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3';
        const testQuery = 'hello world program in three different languages';
        
        console.log(`📊 Target namespace: ${namespace}`);
        console.log(`🔍 Test query: "${testQuery}"`);
        
        // Step 1: Generate embedding for the query
        console.log('\n📊 Step 1: Generating query embedding...');
        const queryEmbedding = await embeddings.embedQuery(testQuery);
        console.log(`✅ Generated embedding with ${queryEmbedding.length} dimensions`);
        
        // Step 2: Perform the exact same query that QueryPipeline does
        console.log('\n📊 Step 2: Performing vector search...');
        const searchResults = await pineconeService.querySimilar(queryEmbedding, {
            namespace: namespace,
            topK: 10,
            threshold: 0.3,
            includeMetadata: true
        });
        
        console.log(`📊 Raw results: ${searchResults.matches?.length || 0} matches`);
        
        // Step 3: Analyze the results in detail
        console.log('\n📊 Step 3: Analyzing search results...');
        
        if (!searchResults.matches || searchResults.matches.length === 0) {
            console.log('❌ No matches found!');
            return;
        }
        
        // Check for duplicates by content
        const contentGroups = new Map();
        const sourceGroups = new Map();
        
        searchResults.matches.forEach((match, index) => {
            const content = match.metadata?.text || match.metadata?.content || '';
            const source = match.metadata?.source || 'unknown';
            const type = match.metadata?.type || 'unknown';
            
            console.log(`\n🔍 Match ${index + 1}:`);
            console.log(`   ID: ${match.id}`);
            console.log(`   Score: ${match.score?.toFixed(6) || 'N/A'}`);
            console.log(`   Source: ${source}`);
            console.log(`   Type: ${type}`);
            console.log(`   Content preview: "${content.substring(0, 100)}..."`);
            
            // Group by content hash
            const contentHash = content.substring(0, 200);
            if (!contentGroups.has(contentHash)) {
                contentGroups.set(contentHash, []);
            }
            contentGroups.get(contentHash).push({
                index: index + 1,
                id: match.id,
                score: match.score,
                source: source
            });
            
            // Group by source
            if (!sourceGroups.has(source)) {
                sourceGroups.set(source, 0);
            }
            sourceGroups.set(source, sourceGroups.get(source) + 1);
        });
        
        // Report duplicates
        console.log('\n📊 DUPLICATE ANALYSIS:');
        let totalDuplicateGroups = 0;
        contentGroups.forEach((matches, contentHash) => {
            if (matches.length > 1) {
                totalDuplicateGroups++;
                console.log(`\n⚠️  Duplicate Group ${totalDuplicateGroups}:`);
                console.log(`   Content: "${contentHash}..."`);
                console.log(`   Occurrences: ${matches.length}`);
                matches.forEach(match => {
                    console.log(`   - Match ${match.index}: ID ${match.id}, Score ${match.score?.toFixed(6)}, Source: ${match.source}`);
                });
            }
        });
        
        if (totalDuplicateGroups === 0) {
            console.log('✅ No exact content duplicates found');
        } else {
            console.log(`⚠️  Found ${totalDuplicateGroups} groups of duplicate content`);
        }
        
        // Report source distribution
        console.log('\n📊 SOURCE DISTRIBUTION:');
        sourceGroups.forEach((count, source) => {
            console.log(`   ${source}: ${count} matches`);
        });
        
        // Check if all results are identical
        if (contentGroups.size === 1 && searchResults.matches.length > 1) {
            console.log('\n🚨 PROBLEM IDENTIFIED: All results have identical content!');
            console.log('   This explains why the AI receives 10 copies of the same document.');
            console.log('   The vector database contains duplicate embeddings of the same content.');
        }
        
        // Check if scores are very similar (indicating near-duplicates)
        const scores = searchResults.matches.map(m => m.score).sort((a, b) => b - a);
        const scoreRange = scores[0] - scores[scores.length - 1];
        
        console.log('\n📊 SCORE ANALYSIS:');
        console.log(`   Highest score: ${scores[0]?.toFixed(6) || 'N/A'}`);
        console.log(`   Lowest score: ${scores[scores.length - 1]?.toFixed(6) || 'N/A'}`);
        console.log(`   Score range: ${scoreRange?.toFixed(6) || 'N/A'}`);
        
        if (scoreRange < 0.01) {
            console.log('🚨 SUSPICIOUS: All scores are very similar, indicating near-duplicate embeddings');
        }
        
    } catch (error) {
        console.error('❌ Error during debugging:', error.message);
        console.error('Stack:', error.stack);
    }
}

if (require.main === module) {
    debugQueryPipelineBehavior().catch(console.error);
}

module.exports = { debugQueryPipelineBehavior };