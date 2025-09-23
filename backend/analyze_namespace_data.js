#!/usr/bin/env node

/**
 * Clear Repository Tracking for Namespace Fix
 * This will clear the repository tracking so it can be reindexed under the correct user namespace
 */

require('dotenv').config();

async function clearRepositoryTracking() {
    console.log('🗑️ CLEARING REPOSITORY TRACKING FOR NAMESPACE FIX');
    console.log('==================================================');
    
    try {
        // Import the Pinecone service
        const PineconeService = require('./business_modules/ai/infrastructure/ai/pinecone/PineconeService');
        
        console.log('🔧 Initializing Pinecone service...');
        
        const pineconeService = new PineconeService();
        
        console.log('📊 Clearing repository tracking for system namespace...');
        
        // Query for the repository tracking document in the system namespace
        const systemNamespace = 'anatolyzader_vc-3_main';
        const userNamespace = 'd41402df-182a-41ec-8f05-153118bf2718';
        
        console.log(`🎯 System namespace: ${systemNamespace}`);
        console.log(`👤 User namespace: ${userNamespace}`);
        
        // The repository tracking is stored with metadata like repoId: "anatolyZader/vc-3"
        // Let's query and see what exists
        
        console.log('🔍 Querying system namespace for repository tracking...');
        
        // Create a dummy query to see what's in the system namespace
        const dummyVector = Array(3072).fill(0.1); // Create 3072-dimensional dummy vector
        
        const systemResults = await pineconeService.querySimilar(dummyVector, {
            topK: 100,
            namespace: systemNamespace,
            includeMetadata: true,
            filter: {
                repoId: "anatolyZader/vc-3"
            }
        });
        
        console.log(`📊 Found ${systemResults.matches?.length || 0} documents in system namespace`);
        
        if (systemResults.matches && systemResults.matches.length > 0) {
            console.log('📝 Sample documents found:');
            systemResults.matches.slice(0, 3).forEach((match, i) => {
                console.log(`  ${i + 1}. ID: ${match.id}`);
                console.log(`     Type: ${match.metadata?.type || 'unknown'}`);
                console.log(`     Repo: ${match.metadata?.repoId || 'unknown'}`);
            });
        }
        
        console.log('\n🔍 Querying user namespace...');
        
        const userResults = await pineconeService.querySimilar(dummyVector, {
            topK: 100,
            namespace: userNamespace,
            includeMetadata: true,
            filter: {
                repoId: "anatolyZader/vc-3"
            }
        });
        
        console.log(`📊 Found ${userResults.matches?.length || 0} documents in user namespace`);
        
        if (userResults.matches && userResults.matches.length > 0) {
            console.log('📝 Sample documents found:');
            userResults.matches.slice(0, 3).forEach((match, i) => {
                console.log(`  ${i + 1}. ID: ${match.id}`);
                console.log(`     Type: ${match.metadata?.type || 'unknown'}`);
                console.log(`     Repo: ${match.metadata?.repoId || 'unknown'}`);
            });
        }
        
        console.log('\n✅ NAMESPACE ANALYSIS COMPLETED!');
        console.log('=================================');
        console.log(`📊 System namespace documents: ${systemResults.matches?.length || 0}`);
        console.log(`👤 User namespace documents: ${userResults.matches?.length || 0}`);
        
        if (systemResults.matches && systemResults.matches.length > 0) {
            console.log('\n🔄 RECOMMENDATION:');
            console.log('The repository data exists in the system namespace but not in the user namespace.');
            console.log('We need to copy or reindex the data for the user namespace.');
        }
        
    } catch (error) {
        console.error('❌ Error analyzing namespaces:', error);
        process.exit(1);
    }
}

// Run the analysis
clearRepositoryTracking();