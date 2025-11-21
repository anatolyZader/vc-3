#!/usr/bin/env node

/**
 * Clean Duplicate Vector Chunks
 * 
 * This script identifies and removes duplicate content chunks that are causing
 * the RAG system to return multiple copies of the same content.
 */

require('dotenv').config();

async function cleanDuplicateVectorChunks() {
    console.log('🧹 CLEANING DUPLICATE VECTOR CHUNKS');
    console.log('=' .repeat(60));
    
    try {
        // Import required services
        const PineconeService = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pineconeService');
        const PineconePlugin = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pineconePlugin');
        const { OpenAIEmbeddings } = require('@langchain/openai');
        
        console.log('📦 Initializing services...');
        
        const pineconePlugin = new PineconePlugin();
        const pineconeService = new PineconeService({
            pineconePlugin: pineconePlugin,
            rateLimiter: null
        });
        
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: 'text-embedding-3-large',
            dimensions: 3072
        });
        
        const namespace = 'd41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3';
        
        console.log(`📊 Target namespace: ${namespace}`);
        
        // Step 1: Sample the vector database to identify all duplicates  
        console.log('\n📊 Step 1: Sampling vector database for duplicates...');
        
        const sampleQueries = [
            new Array(3072).fill(0.1),
            new Array(3072).fill(0.2), 
            new Array(3072).fill(0.3),
            new Array(3072).fill(0.4),
            new Array(3072).fill(0.5)
        ];
        
        const allSamples = new Map(); // Use Map to avoid duplicates in sampling
        
        for (let i = 0; i < sampleQueries.length; i++) {
            console.log(`   Sampling with query ${i + 1}/${sampleQueries.length}...`);
            
            const searchResults = await pineconeService.querySimilar(sampleQueries[i], {
                namespace: namespace,
                topK: 50, // Get larger sample
                threshold: 0.0, // Include all results
                includeMetadata: true
            });
            
            if (searchResults.matches) {
                searchResults.matches.forEach(match => {
                    if (!allSamples.has(match.id)) {
                        allSamples.set(match.id, {
                            id: match.id,
                            content: match.metadata?.text || match.metadata?.content || '',
                            source: match.metadata?.source || 'unknown',
                            type: match.metadata?.type || 'unknown',
                            metadata: match.metadata
                        });
                    }
                });
            }
        }
        
        console.log(`📊 Collected ${allSamples.size} unique vector samples`);
        
        // Step 2: Group by content to find duplicates
        console.log('\n📊 Step 2: Identifying duplicate content groups...');
        
        const contentGroups = new Map();
        
        allSamples.forEach(sample => {
            // Use first 300 characters as content hash to identify duplicates
            const contentHash = sample.content.substring(0, 300).trim();
            
            if (!contentGroups.has(contentHash)) {
                contentGroups.set(contentHash, []);
            }
            contentGroups.get(contentHash).push(sample);
        });
        
        // Step 3: Identify which duplicates to remove
        console.log('\n📊 Step 3: Planning duplicate removal...');
        
        const toDelete = [];
        let duplicateGroups = 0;
        
        contentGroups.forEach((samples, contentHash) => {
            if (samples.length > 1) {
                duplicateGroups++;
                console.log(`\n🔄 Duplicate Group ${duplicateGroups}:`);
                console.log(`   Content preview: "${contentHash.substring(0, 80)}..."`);
                console.log(`   Duplicates found: ${samples.length}`);
                
                // Sort by timestamp (newer first) - keep the newest, delete the rest
                samples.sort((a, b) => {
                    const timestampA = a.id.split('_').pop();
                    const timestampB = b.id.split('_').pop();
                    return parseInt(timestampB) - parseInt(timestampA);
                });
                
                // Keep the first (newest), mark the rest for deletion
                for (let i = 1; i < samples.length; i++) {
                    toDelete.push(samples[i].id);
                    console.log(`   ❌ Will delete: ${samples[i].id}`);
                }
                console.log(`   ✅ Will keep: ${samples[0].id}`);
            }
        });
        
        console.log(`\n📊 CLEANUP SUMMARY:`);
        console.log(`   Total unique content pieces: ${contentGroups.size}`);
        console.log(`   Duplicate groups found: ${duplicateGroups}`);
        console.log(`   Vectors to delete: ${toDelete.length}`);
        console.log(`   Vectors to keep: ${allSamples.size - toDelete.length}`);
        
        // Step 4: Execute deletion
        if (toDelete.length > 0) {
            console.log(`\n🗑️  Step 4: Deleting ${toDelete.length} duplicate vectors...`);
            
            // Delete in batches of 50 (Pinecone limit)
            const batchSize = 50;
            let deleted = 0;
            
            for (let i = 0; i < toDelete.length; i += batchSize) {
                const batch = toDelete.slice(i, i + batchSize);
                console.log(`   Deleting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(toDelete.length / batchSize)} (${batch.length} vectors)...`);
                
                try {
                    await pineconeService.deleteVectors(batch, namespace);
                    deleted += batch.length;
                    console.log(`   ✅ Deleted ${batch.length} vectors`);
                } catch (error) {
                    console.error(`   ❌ Failed to delete batch: ${error.message}`);
                }
                
                // Small delay between batches
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            console.log(`\n✅ CLEANUP COMPLETED:`);
            console.log(`   Successfully deleted: ${deleted} duplicate vectors`);
            console.log(`   Failed deletions: ${toDelete.length - deleted}`);
            
            // Verify cleanup
            console.log(`\n🔍 Verifying cleanup...`);
            const testQuery = await embeddings.embedQuery('test query for verification');
            const verifyResults = await pineconeService.querySimilar(testQuery, {
                namespace: namespace,
                topK: 10,
                threshold: 0.0,
                includeMetadata: true
            });
            
            console.log(`📊 After cleanup: ${verifyResults.matches?.length || 0} vectors in sample`);
            
            // Check for remaining duplicates
            const remainingContentGroups = new Map();
            if (verifyResults.matches) {
                verifyResults.matches.forEach(match => {
                    const content = match.metadata?.text || match.metadata?.content || '';
                    const contentHash = content.substring(0, 300).trim();
                    remainingContentGroups.set(contentHash, (remainingContentGroups.get(contentHash) || 0) + 1);
                });
            }
            
            const remainingDuplicates = Array.from(remainingContentGroups.values()).filter(count => count > 1).length;
            if (remainingDuplicates === 0) {
                console.log('✅ No duplicate content found in verification sample');
            } else {
                console.log(`⚠️  Still found ${remainingDuplicates} potential duplicates in sample`);
            }
            
        } else {
            console.log('\n✅ No duplicates found to clean!');
        }
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
        console.error('Stack:', error.stack);
    }
}

if (require.main === module) {
    cleanDuplicateVectorChunks().catch(console.error);
}

module.exports = { cleanDuplicateVectorChunks };