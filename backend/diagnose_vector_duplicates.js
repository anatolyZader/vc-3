#!/usr/bin/env node

/**
 * Diagnose Vector Database Duplicates
 * 
 * This script identifies duplicate content in the vector database,
 * specifically targeting the OpenAPI schema duplication issue we saw in the logs.
 */

require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function diagnoseVectorDuplicates() {
    console.log('🔍 DIAGNOSING VECTOR DATABASE DUPLICATES');
    console.log('=' .repeat(60));
    
    try {
        const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        const indexName = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
        const namespace = 'd41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3';
        
        console.log(`📊 Target: ${indexName} -> ${namespace}`);
        
        const index = pinecone.index(indexName);
        
        // Get index stats
        const stats = await index.describeIndexStats();
        const vectorCount = stats.namespaces?.[namespace]?.vectorCount || 0;
        console.log(`📊 Total vectors in namespace: ${vectorCount}`);
        
        // Sample vectors to look for duplicates
        console.log('\n🔍 SAMPLING VECTORS TO IDENTIFY DUPLICATES...');
        
        // Use different query vectors to get different samples
        const sampleQueries = [
            new Array(3072).fill(0.1),  // Generic query 1
            new Array(3072).fill(0.2),  // Generic query 2  
            new Array(3072).fill(0.3),  // Generic query 3
        ];
        
        const allSamples = [];
        
        for (let i = 0; i < sampleQueries.length; i++) {
            const queryResult = await index.query({
                namespace: namespace,
                vector: sampleQueries[i],
                topK: 20,
                includeMetadata: true
            });
            
            if (queryResult.matches) {
                allSamples.push(...queryResult.matches);
            }
        }
        
        console.log(`📊 Collected ${allSamples.length} sample vectors`);
        
        // Analyze content for duplicates
        const contentMap = new Map();
        const sourceMap = new Map();
        const typeMap = new Map();
        
        allSamples.forEach(match => {
            const content = match.metadata?.text || match.metadata?.content || '';
            const source = match.metadata?.source || 'unknown';
            const type = match.metadata?.type || 'unknown';
            const id = match.id;
            
            // Track content duplicates
            const contentHash = content.substring(0, 200); // First 200 chars as hash
            if (!contentMap.has(contentHash)) {
                contentMap.set(contentHash, []);
            }
            contentMap.get(contentHash).push({ id, source, type, score: match.score });
            
            // Track sources
            sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
            
            // Track types
            typeMap.set(type, (typeMap.get(type) || 0) + 1);
        });
        
        // Report findings
        console.log('\n📊 CONTENT ANALYSIS:');
        console.log(`   Unique content pieces: ${contentMap.size}`);
        console.log(`   Total samples analyzed: ${allSamples.length}`);
        
        // Find duplicates
        const duplicates = [];
        contentMap.forEach((matches, contentHash) => {
            if (matches.length > 1) {
                duplicates.push({ contentHash, matches });
            }
        });
        
        console.log(`\n⚠️  DUPLICATE CONTENT FOUND: ${duplicates.length} groups`);
        
        duplicates.forEach((dup, index) => {
            console.log(`\n🔄 Duplicate Group ${index + 1}:`);
            console.log(`   Content preview: "${dup.contentHash}"`);
            console.log(`   Occurrences: ${dup.matches.length}`);
            dup.matches.forEach((match, i) => {
                console.log(`   ${i + 1}. ID: ${match.id}`);
                console.log(`      Source: ${match.source}`);  
                console.log(`      Type: ${match.type}`);
                console.log(`      Score: ${match.score?.toFixed(3) || 'N/A'}`);
            });
        });
        
        console.log('\n📊 SOURCE DISTRIBUTION:');
        sourceMap.forEach((count, source) => {
            console.log(`   ${source}: ${count} vectors`);
        });
        
        console.log('\n📊 TYPE DISTRIBUTION:');
        typeMap.forEach((count, type) => {
            console.log(`   ${type}: ${count} vectors`);
        });
        
        // Look specifically for OpenAPI schema content
        console.log('\n🔍 SEARCHING FOR OPENAPI SCHEMA DUPLICATES...');
        const openApiDuplicates = [];
        
        allSamples.forEach(match => {
            const content = match.metadata?.text || match.metadata?.content || '';
            if (content.includes('"openapi": "3.0.3"') || 
                content.includes('"title": "EventStorm.me API"') ||
                content.includes('PINECONE_API_KEY') ||
                content.includes('"additionalProperties": false')) {
                openApiDuplicates.push({
                    id: match.id,
                    source: match.metadata?.source || 'unknown',
                    type: match.metadata?.type || 'unknown',
                    score: match.score,
                    contentPreview: content.substring(0, 100)
                });
            }
        });
        
        if (openApiDuplicates.length > 0) {
            console.log(`⚠️  FOUND ${openApiDuplicates.length} OPENAPI SCHEMA VECTORS:`);
            openApiDuplicates.forEach((item, i) => {
                console.log(`   ${i + 1}. ID: ${item.id}`);
                console.log(`      Source: ${item.source}`);
                console.log(`      Type: ${item.type}`);
                console.log(`      Score: ${item.score?.toFixed(3) || 'N/A'}`);
                console.log(`      Preview: "${item.contentPreview}..."`);
            });
            
            // Offer to clean these
            console.log('\n🧹 CLEANUP RECOMMENDATION:');
            console.log(`   Found ${openApiDuplicates.length} OpenAPI schema vectors that may be duplicates`);
            console.log('   These appear to be causing the retrieval issues you experienced');
            console.log('   Consider removing all but one of these documents');
        }
        
    } catch (error) {
        console.error('❌ Error during diagnosis:', error.message);
        console.error('Stack:', error.stack);
    }
}

if (require.main === module) {
    diagnoseVectorDuplicates().catch(console.error);
}

module.exports = { diagnoseVectorDuplicates };