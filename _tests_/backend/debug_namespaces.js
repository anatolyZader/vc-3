#!/usr/bin/env node
/**
 * Debug script to check namespace contents and fetch sample vectors
 */

require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function debugNamespaces() {
    console.log(`[${new Date().toISOString()}] 🔍 NAMESPACE DEBUG: Investigating namespace contents`);
    
    try {
        // Initialize Pinecone directly
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });
        
        const indexName = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
        const index = pinecone.index(indexName);
        
        console.log(`[${new Date().toISOString()}] 📊 Using index: ${indexName}`);
        
        // Check index stats
        console.log(`[${new Date().toISOString()}] 🔍 Checking index statistics...`);
        const stats = await index.describeIndexStats();
        console.log(`[${new Date().toISOString()}] 📈 INDEX STATS:`, JSON.stringify(stats, null, 2));
        
        // Try to fetch specific IDs from old namespace based on your Pinecone interface
        const oldNamespace = 'anatolyzader_vc-3_main';
        const newNamespace = 'anatolyzader_vc-3';
        
        // Using the ID you showed me from Pinecone interface
        const sampleId = 'anatolyzader_vc-3_main_BACKEND_PROCESSING_TRIGGER_md_chunk_1_1759749971482';
        
        console.log(`[${new Date().toISOString()}] 🔍 Trying to fetch sample vector from old namespace...`);
        console.log(`[${new Date().toISOString()}] 🎯 Sample ID: ${sampleId}`);
        
        try {
            const fetchResult = await index.fetch({
                ids: [sampleId],
                namespace: oldNamespace
            });
            
            console.log(`[${new Date().toISOString()}] ✅ FETCH SUCCESS from old namespace:`);
            console.log(`  - Vectors found: ${Object.keys(fetchResult.vectors || {}).length}`);
            if (fetchResult.vectors && Object.keys(fetchResult.vectors).length > 0) {
                const vector = fetchResult.vectors[sampleId];
                console.log(`  - Vector metadata keys: ${Object.keys(vector.metadata || {}).join(', ')}`);
                console.log(`  - Source file: ${vector.metadata?.source || 'unknown'}`);
            }
        } catch (fetchError) {
            console.log(`[${new Date().toISOString()}] ❌ FETCH FAILED from old namespace:`, fetchError.message);
        }
        
        // Try the same with new namespace
        console.log(`[${new Date().toISOString()}] 🔍 Checking new namespace for any existing data...`);
        try {
            // Try to list some vectors from new namespace using query
            const queryVector = new Array(3072).fill(0.1);
            const queryResult = await index.query({
                vector: queryVector,
                topK: 5,
                namespace: newNamespace,
                includeMetadata: true
            });
            
            console.log(`[${new Date().toISOString()}] 📊 NEW NAMESPACE QUERY RESULT:`);
            console.log(`  - Matches found: ${queryResult.matches?.length || 0}`);
            if (queryResult.matches?.length > 0) {
                queryResult.matches.forEach((match, i) => {
                    console.log(`  - Match ${i + 1}: ${match.id} (score: ${match.score})`);
                });
            }
        } catch (queryError) {
            console.log(`[${new Date().toISOString()}] ❌ QUERY FAILED on new namespace:`, queryError.message);
        }
        
        // Try to query old namespace to see actual data
        console.log(`[${new Date().toISOString()}] 🔍 Querying old namespace to see what's actually there...`);
        try {
            const queryVector = new Array(3072).fill(0.1);
            const queryResult = await index.query({
                vector: queryVector,
                topK: 10,
                namespace: oldNamespace,
                includeMetadata: true
            });
            
            console.log(`[${new Date().toISOString()}] 📊 OLD NAMESPACE QUERY RESULT:`);
            console.log(`  - Matches found: ${queryResult.matches?.length || 0}`);
            if (queryResult.matches?.length > 0) {
                console.log(`  - First few matches:`);
                queryResult.matches.slice(0, 3).forEach((match, i) => {
                    console.log(`    ${i + 1}. ${match.id} (score: ${match.score})`);
                    console.log(`       Source: ${match.metadata?.source || 'unknown'}`);
                });
            }
        } catch (queryError) {
            console.log(`[${new Date().toISOString()}] ❌ QUERY FAILED on old namespace:`, queryError.message);
        }
        
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Debug failed:`, error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run debug if called directly
if (require.main === module) {
    debugNamespaces()
        .then(() => {
            console.log(`[${new Date().toISOString()}] 🏁 Debug script completed`);
            process.exit(0);
        })
        .catch(error => {
            console.error(`[${new Date().toISOString()}] ❌ Debug script failed:`, error.message);
            process.exit(1);
        });
}