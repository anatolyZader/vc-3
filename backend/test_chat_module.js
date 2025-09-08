#!/usr/bin/env node
'use strict';

// Isolated test for chat module similarity search issue
const path = require('path');
const { DirectoryLoader } = require('langchain/document_loaders/fs/directory');
const { TextLoader } = require('langchain/document_loaders/fs/text');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { PineconeStore } = require('@langchain/pinecone');
const { Pinecone } = require('@pinecone-database/pinecone');

require('dotenv').config();

async function testChatModuleProcessing() {
    console.log('=== Testing Chat Module Processing ===');
    
    try {
        // Initialize embeddings
        console.log('1. Initializing embeddings...');
        const embeddings = new OpenAIEmbeddings({
            model: 'text-embedding-3-large',
            apiKey: process.env.OPENAI_API_KEY
        });
        
        // Initialize Pinecone
        console.log('2. Initializing Pinecone...');
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY
        });
        const pineconeIndexName = 'eventstorm-docs';
        
        // Test loading chat module specifically
        console.log('3. Loading chat module files...');
        const chatModulePath = path.resolve(__dirname, 'business_modules/chat');
        const loader = new DirectoryLoader(
            chatModulePath,
            {
                '.js': (filePath) => new TextLoader(filePath),
                '.md': (filePath) => new TextLoader(filePath),
            },
            true // recursive
        );
        
        const docs = await loader.load();
        console.log(`   Loaded ${docs.length} documents from chat module`);
        
        // Check document contents
        console.log('4. Analyzing document contents...');
        for (let i = 0; i < Math.min(3, docs.length); i++) {
            const doc = docs[i];
            console.log(`   Doc ${i}: ${doc.metadata.source} (${doc.pageContent.length} chars)`);
            if (doc.pageContent.length > 10000) {
                console.log(`   WARNING: Large document detected: ${doc.pageContent.length} characters`);
            }
        }
        
        // Test text splitting
        console.log('5. Testing text splitter...');
        const splitter = RecursiveCharacterTextSplitter.fromLanguage("js", { 
            chunkSize: 1500, 
            chunkOverlap: 250 
        });
        
        const splits = await splitter.splitDocuments(docs);
        console.log(`   Created ${splits.length} document splits`);
        
        // Test Pinecone connection
        console.log('6. Testing Pinecone connection...');
        const pineconeIndex = pinecone.index(pineconeIndexName);
        const vectorStore = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex });
        console.log('   Pinecone connection successful');
        
        // Test similarity search with timeout
        console.log('7. Testing similarity search (with timeout)...');
        const searchPromise = vectorStore.similaritySearch(
            'High-level summary of the "chat" module\'s purpose, architecture, and key functionalities.',
            20
        );
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Similarity search timeout')), 30000);
        });
        
        const searchResults = await Promise.race([searchPromise, timeoutPromise]);
        console.log(`   Similarity search completed: ${searchResults.length} results`);
        
        // Filter for chat module specific docs
        console.log('8. Testing document filtering...');
        const relevantDocs = searchResults.filter(doc => 
            doc.metadata.source && doc.metadata.source.startsWith(chatModulePath)
        );
        console.log(`   Found ${relevantDocs.length} relevant documents for chat module`);
        
        console.log('✅ All tests passed! Chat module processing is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack trace:', error.stack);
        
        // Log memory state at error
        const memUsage = process.memoryUsage();
        console.error('Memory usage at error:', {
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
            external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
        });
    }
}

// Handle process events
process.on('SIGINT', () => {
    console.log('\nTest interrupted');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nTest terminated');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the test
testChatModuleProcessing();
