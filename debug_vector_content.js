#!/usr/bin/env node

/**
 * Debug Vector Content - Check what's actually stored in Pinecone
 * 
 * This script queries the vector database to see what content is indexed
 * and help identify why AI responses aren't code-aware.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { OpenAIEmbeddings } = require('@langchain/openai');

// Import our services
const PineconePlugin = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pineconePlugin');
const PineconeService = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pineconeService');

async function debugVectorContent() {
  console.log('🔍 Debug Vector Content - Checking Pinecone database');
  console.log('=====================================');
  
  try {
    // Initialize services
    const pineconePlugin = new PineconePlugin();
    const pineconeService = new PineconeService({ pineconePlugin });
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      model: 'text-embedding-3-small'
    });

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test queries to see what content is in the database
    const testQueries = [
      'dependency injection',
      'DI system implementation',
      'module dependencies',
      'JavaScript code',
      'class definition',
      'function implementation'
    ];

    console.log(`\n📊 Testing ${testQueries.length} queries to analyze vector content...\n`);

    for (const query of testQueries) {
      console.log(`\n🔍 Query: "${query}"`);
      console.log('─'.repeat(50));
      
      try {
        // Generate embedding for query
        const queryEmbedding = await embeddings.embedQuery(query);
        
        // Search with hardcoded namespace that we know exists
        const namespace = 'd41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3';
        const results = await pineconeService.querySimilar(queryEmbedding, {
          namespace,
          topK: 5,
          threshold: 0.1, // Very low threshold to get everything
          includeMetadata: true
        });

        if (results.matches && results.matches.length > 0) {
          console.log(`✅ Found ${results.matches.length} matches`);
          
          results.matches.forEach((match, index) => {
            console.log(`\n📄 Match ${index + 1}:`);
            console.log(`   Score: ${match.score.toFixed(3)}`);
            console.log(`   ID: ${match.id}`);
            console.log(`   Source: ${match.metadata?.source || 'Unknown'}`);
            console.log(`   Type: ${match.metadata?.type || 'Unknown'}`);
            console.log(`   File: ${match.metadata?.fileName || 'N/A'}`);
            console.log(`   Repo: ${match.metadata?.repository || match.metadata?.repoUrl || 'N/A'}`);
            
            const content = match.metadata?.text || match.metadata?.content || '';
            console.log(`   Content Length: ${content.length} chars`);
            console.log(`   Content Preview: "${content.substring(0, 150)}${content.length > 150 ? '...' : ''}"`);
            
            // Check if it's code vs documentation
            const isCode = content.includes('class ') || content.includes('function ') || 
                          content.includes('const ') || content.includes('module.exports') ||
                          content.includes('require(') || content.includes('import ');
            console.log(`   Content Type: ${isCode ? '🟢 CODE' : '🔴 DOCUMENTATION/OTHER'}`);
          });
        } else {
          console.log('❌ No matches found');
        }
        
      } catch (error) {
        console.error(`❌ Error querying "${query}":`, error.message);
      }
    }

    // Get index stats
    console.log('\n📈 Getting index statistics...');
    try {
      const index = await pineconeService.getIndex();
      const stats = await index.describeIndexStats();
      console.log('Index Statistics:', JSON.stringify(stats, null, 2));
    } catch (error) {
      console.warn('⚠️ Could not get index stats:', error.message);
    }

    // Sample random vectors to understand data structure
    console.log('\n🎲 Sampling namespace content...');
    try {
      const index = await pineconeService.getIndex();
      const namespace = 'd41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3';
      
      // Query with dummy vector to see what's in the namespace
      const dummyEmbedding = new Array(1536).fill(0.001); // Small values to match anything
      const sampleResults = await index.namespace(namespace).query({
        vector: dummyEmbedding,
        topK: 10,
        includeMetadata: true
      });

      console.log(`\n📋 Sample of namespace content (${sampleResults.matches?.length || 0} items):`);
      sampleResults.matches?.forEach((match, index) => {
        console.log(`\n${index + 1}. ID: ${match.id}`);
        console.log(`   Source: ${match.metadata?.source || 'Unknown'}`);
        console.log(`   Type: ${match.metadata?.type || 'Unknown'}`);
        console.log(`   File: ${match.metadata?.fileName || 'N/A'}`);
        
        const content = match.metadata?.text || match.metadata?.content || '';
        const contentType = content.includes('class ') || content.includes('function ') ? 'CODE' : 'DOC/OTHER';
        console.log(`   Content: ${contentType} (${content.length} chars)`);
        console.log(`   Preview: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`);
      });

    } catch (error) {
      console.warn('⚠️ Could not sample namespace content:', error.message);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
  }

  console.log('\n🏁 Debug complete!');
  console.log('\n💡 Analysis:');
  console.log('   - If most content shows as "DOC/OTHER", the vector DB needs more code');
  console.log('   - If content is repetitive (same JSON schema), there\'s a data quality issue');
  console.log('   - If no matches found, the namespace might be wrong or empty');
  
  process.exit(0);
}

// Run the debug
debugVectorContent().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});