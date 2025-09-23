#!/usr/bin/env node

// test_repo_namespace.js - Test the repository namespace
console.log('🔍 Testing Repository Namespace...');

require('dotenv').config();

const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');

async function testRepoNamespace() {
    try {
        // Initialize Pinecone
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });

        const index = pinecone.index('eventstorm-index');

        // Test embedding generation
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            model: 'text-embedding-3-large'
        });

        const testQuery = 'how is event driven design implemented in eventstorm.me app?';
        const queryEmbedding = await embeddings.embedQuery(testQuery);

        // Test repository namespace
        const repoNamespace = 'anatolyzader_vc-3_main';
        console.log('🎯 Testing repository namespace:', repoNamespace);

        const repoResults = await index.namespace(repoNamespace).query({
            vector: queryEmbedding,
            topK: 10,
            includeMetadata: true,
            includeValues: false
        });

        console.log('📊 Repository Search Results:');
        console.log('- Matches found:', repoResults.matches?.length || 0);
        
        if (repoResults.matches && repoResults.matches.length > 0) {
            repoResults.matches.forEach((match, i) => {
                console.log(`\n🎯 Repo Match ${i + 1}:`);
                console.log('  - Score:', match.score);
                console.log('  - ID:', match.id);
                console.log('  - Source:', match.metadata?.source || 'unknown');
                console.log('  - Type:', match.metadata?.type || 'unknown');
                console.log('  - Text preview:', match.metadata?.text?.substring(0, 100) + '...');
            });
        } else {
            console.log('❌ No matches found in repository namespace');
        }

        // Let's also try to fetch some vectors directly
        console.log('\n🔍 Fetching vector IDs from repository namespace...');
        
        // List some vectors by doing a very broad search
        const broadResults = await index.namespace(repoNamespace).query({
            vector: new Array(3072).fill(0), // Zero vector to get any results
            topK: 10,
            includeMetadata: true,
            includeValues: false
        });

        console.log('📋 Available vectors in repository namespace:');
        if (broadResults.matches && broadResults.matches.length > 0) {
            broadResults.matches.forEach((match, i) => {
                console.log(`\n📄 Vector ${i + 1}:`);
                console.log('  - ID:', match.id);
                console.log('  - Source:', match.metadata?.source || 'unknown');
                console.log('  - Repository:', match.metadata?.repository || 'unknown');
                console.log('  - File Type:', match.metadata?.file_type || 'unknown');
                console.log('  - Text preview:', match.metadata?.text?.substring(0, 200) + '...');
            });
        }

    } catch (error) {
        console.error('❌ Error during repository namespace test:', error);
    }
}

testRepoNamespace();