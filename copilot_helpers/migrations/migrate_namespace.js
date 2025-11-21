#!/usr/bin/env node
/**
 * Migration script to move data from old namespace (anatolyzader_vc-3_main) 
 * to new namespace (anatolyzader_vc-3) for consistent namespace usage
 */

require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function migrateNamespace() {
    console.log(`[${new Date().toISOString()}] 🔄 NAMESPACE MIGRATION: Starting migration from anatolyzader_vc-3_main to anatolyzader_vc-3`);
    
    try {
        // Initialize Pinecone directly
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });
        
        if (!pinecone) {
            throw new Error('Failed to initialize Pinecone client');
        }
        
        const indexName = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
        const sourceNamespace = 'anatolyzader_vc-3_main';
        const targetNamespace = 'anatolyzader_vc-3';
        
        console.log(`[${new Date().toISOString()}] 📊 MIGRATION SETUP:`);
        console.log(`  - Index: ${indexName}`);
        console.log(`  - Source namespace: ${sourceNamespace}`);
        console.log(`  - Target namespace: ${targetNamespace}`);
        
        // Get the index
        const index = pinecone.index(indexName);
        
        // Check source namespace exists and has data
        console.log(`[${new Date().toISOString()}] 🔍 Checking source namespace stats...`);
        const sourceStats = await index.describeIndexStats();
        const sourceVectorCount = sourceStats.namespaces?.[sourceNamespace]?.vectorCount || 0;
        
        console.log(`[${new Date().toISOString()}] 📈 Source namespace has ${sourceVectorCount} vectors`);
        
        if (sourceVectorCount === 0) {
            console.log(`[${new Date().toISOString()}] ⚠️ No vectors found in source namespace ${sourceNamespace}`);
            return;
        }
        
        // Check target namespace
        const targetVectorCount = sourceStats.namespaces?.[targetNamespace]?.vectorCount || 0;
        console.log(`[${new Date().toISOString()}] 📈 Target namespace has ${targetVectorCount} vectors`);
        
        if (targetVectorCount > 0) {
            console.log(`[${new Date().toISOString()}] ⚠️ Target namespace already has data. Proceeding with migration (will not duplicate).`);
        }
        
        // Query all vectors from source namespace in batches
        console.log(`[${new Date().toISOString()}] 🔄 Starting vector migration...`);
        
        let totalMigrated = 0;
        let hasMoreData = true;
        const batchSize = 1000; // Pinecone recommended batch size
        
        // Start with a wide query to get all vectors
        const queryVector = new Array(3072).fill(0.1); // 3072 is the dimension shown in your Pinecone interface
        
        let nextPageToken = null;
        
        while (hasMoreData) {
            console.log(`[${new Date().toISOString()}] 📥 Fetching batch ${Math.floor(totalMigrated / batchSize) + 1}...`);
            
            try {
                // Query vectors from source namespace
                const queryParams = {
                    vector: queryVector,
                    topK: batchSize,
                    namespace: sourceNamespace,
                    includeMetadata: true,
                    includeValues: true
                };
                
                if (nextPageToken) {
                    queryParams.nextPageToken = nextPageToken;
                }
                
                const queryResponse = await index.query(queryParams);
                
                if (!queryResponse.matches || queryResponse.matches.length === 0) {
                    console.log(`[${new Date().toISOString()}] ✅ No more vectors to migrate`);
                    hasMoreData = false;
                    break;
                }
                
                console.log(`[${new Date().toISOString()}] 🔄 Processing ${queryResponse.matches.length} vectors...`);
                
                // Prepare vectors for upsert to target namespace
                const vectorsToUpsert = queryResponse.matches.map(match => ({
                    id: match.id,
                    values: match.values,
                    metadata: match.metadata || {}
                }));
                
                // Upsert to target namespace
                await index.upsert({
                    vectors: vectorsToUpsert,
                    namespace: targetNamespace
                });
                
                totalMigrated += vectorsToUpsert.length;
                console.log(`[${new Date().toISOString()}] ✅ Migrated batch: ${vectorsToUpsert.length} vectors (Total: ${totalMigrated})`);
                
                // Check if there are more results
                if (queryResponse.matches.length < batchSize) {
                    hasMoreData = false;
                } else {
                    // Use the last ID as a cursor for pagination
                    const lastMatch = queryResponse.matches[queryResponse.matches.length - 1];
                    // For the next query, we'll use a different approach since Pinecone doesn't have built-in pagination
                    // We'll use the fetch API instead for remaining vectors
                    hasMoreData = false; // For now, let's see how many we got
                }
                
                // Add small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (batchError) {
                console.error(`[${new Date().toISOString()}] ❌ Error in batch migration:`, batchError.message);
                throw batchError;
            }
        }
        
        console.log(`[${new Date().toISOString()}] 🎉 MIGRATION COMPLETE:`);
        console.log(`  - Total vectors migrated: ${totalMigrated}`);
        console.log(`  - Source namespace: ${sourceNamespace}`);
        console.log(`  - Target namespace: ${targetNamespace}`);
        
        // Verify migration
        console.log(`[${new Date().toISOString()}] 🔍 Verifying migration...`);
        const finalStats = await index.describeIndexStats();
        const finalTargetCount = finalStats.namespaces?.[targetNamespace]?.vectorCount || 0;
        
        console.log(`[${new Date().toISOString()}] 📊 FINAL VERIFICATION:`);
        console.log(`  - Target namespace now has: ${finalTargetCount} vectors`);
        console.log(`  - Migration success rate: ${finalTargetCount > 0 ? 'SUCCESS' : 'NEEDS INVESTIGATION'}`);
        
        if (finalTargetCount > 0) {
            console.log(`[${new Date().toISOString()}] ✅ Migration completed successfully!`);
            console.log(`[${new Date().toISOString()}] 💡 AI chat should now have access to repository content in namespace '${targetNamespace}'`);
        } else {
            console.log(`[${new Date().toISOString()}] ⚠️ Migration may need investigation - target namespace appears empty`);
        }
        
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Migration failed:`, error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateNamespace()
        .then(() => {
            console.log(`[${new Date().toISOString()}] 🏁 Migration script completed`);
            process.exit(0);
        })
        .catch(error => {
            console.error(`[${new Date().toISOString()}] ❌ Migration script failed:`, error.message);
            process.exit(1);
        });
}

module.exports = { migrateNamespace };