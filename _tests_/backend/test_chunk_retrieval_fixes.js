#!/usr/bin/env node

/**
 * Test script to verify chunk retrieval fixes
 * Tests deduplication, per-source caps, and strategy filter application
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from current directory
dotenv.config({ path: path.join(__dirname, '.env') });

const QueryPipeline = require('./business_modules/ai/infrastructure/ai/rag_pipelines/query/queryPipeline');
const VectorSearchOrchestrator = require('./business_modules/ai/infrastructure/ai/rag_pipelines/query/vectorSearchOrchestrator');
const { OpenAIEmbeddings } = require('@langchain/openai');

class ChunkRetrievalTester {
  constructor() {
    this.testQueries = [
      "How do I implement user authentication in the system?",
      "What are the API endpoints for managing events?",
      "Explain the architecture of the EventStorm application",
      "How does the vector search work in the RAG pipeline?",
      "Show me the code for handling database connections"
    ];
  }

  async initialize() {
    console.log(`[${new Date().toISOString()}] 🚀 Initializing Chunk Retrieval Tester...`);
    
    try {
      // Initialize embeddings model
      this.embeddings = new OpenAIEmbeddings({
        model: 'text-embedding-3-large',
        apiKey: process.env.OPENAI_API_KEY
      });

      console.log(`[${new Date().toISOString()}] ✅ Embeddings model initialized`);

      // Create vector search orchestrator
      this.vectorSearchOrchestrator = new VectorSearchOrchestrator({
        embeddings: this.embeddings,
        apiKey: process.env.PINECONE_API_KEY,
        indexName: process.env.PINECONE_INDEX_NAME,
        region: process.env.PINECONE_REGION,
        defaultTopK: 10,
        defaultThreshold: 0.3,
        maxResults: 50
      });

      console.log(`[${new Date().toISOString()}] ✅ Vector Search Orchestrator initialized`);

      // Create QueryPipeline with test configuration
      this.queryPipeline = new QueryPipeline({
        vectorSearchOrchestrator: this.vectorSearchOrchestrator,
        userId: 'test-user-id',
        embeddings: this.embeddings
      });

      console.log(`[${new Date().toISOString()}] ✅ QueryPipeline initialized`);
      
      return true;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Initialization failed:`, error.message);
      return false;
    }
  }

  async testChunkRetrieval(query) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 TESTING QUERY: "${query}"`);
    console.log(`${'='.repeat(80)}`);

    try {
      // Get vector store
      const vectorStore = await this.queryPipeline.getVectorStore();
      console.log(`[${new Date().toISOString()}] ✅ Vector store obtained with namespace: ${vectorStore.namespace}`);

      // Perform vector search with detailed logging
      const startTime = Date.now();
      const searchResults = await this.queryPipeline.performVectorSearch(
        query, 
        vectorStore, 
        { chunks: [] }, // traceData
        'test-user-id',
        null, // repoId
        null  // repoDescriptor
      );
      const searchDuration = Date.now() - startTime;

      console.log(`\n📊 SEARCH RESULTS SUMMARY:`);
      console.log(`- Duration: ${searchDuration}ms`);
      console.log(`- Total chunks retrieved: ${searchResults.length}`);

      if (searchResults.length === 0) {
        console.log(`❌ No chunks retrieved!`);
        return;
      }

      // Analyze source distribution
      const sourceDistribution = {};
      const typeDistribution = {};
      
      searchResults.forEach(result => {
        const source = result.metadata?.source || 'Unknown';
        const type = result.metadata?.type || 'Unknown';
        
        sourceDistribution[source] = (sourceDistribution[source] || 0) + 1;
        typeDistribution[type] = (typeDistribution[type] || 0) + 1;
      });

      console.log(`\n📈 SOURCE DISTRIBUTION:`);
      Object.entries(sourceDistribution)
        .sort(([,a], [,b]) => b - a)
        .forEach(([source, count]) => {
          console.log(`  - ${source}: ${count} chunks`);
        });

      console.log(`\n🏷️ TYPE DISTRIBUTION:`);
      Object.entries(typeDistribution)
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
          console.log(`  - ${type}: ${count} chunks`);
        });

      // Show detailed chunk information
      console.log(`\n📋 DETAILED CHUNK ANALYSIS:`);
      searchResults.forEach((result, index) => {
        console.log(`\n--- Chunk ${index + 1}/${searchResults.length} ---`);
        console.log(`Source: ${result.metadata?.source || 'Unknown'}`);
        console.log(`Type: ${result.metadata?.type || 'Unknown'}`);
        console.log(`Score: ${result.metadata?.score || 'N/A'}`);
        console.log(`Size: ${result.pageContent?.length || 0} characters`);
        console.log(`Content Preview: ${(result.pageContent || '').substring(0, 150)}...`);
        
        // Show key metadata
        const metadata = result.metadata || {};
        const keyFields = ['repoId', 'repository', 'branch', 'fileType', 'processedAt'];
        keyFields.forEach(field => {
          if (metadata[field]) {
            console.log(`${field}: ${metadata[field]}`);
          }
        });
      });

      // Test deduplication effectiveness
      console.log(`\n🔄 DEDUPLICATION ANALYSIS:`);
      const contentHashes = new Set();
      let duplicates = 0;
      
      searchResults.forEach(result => {
        const hash = this.createSimpleHash(result.pageContent);
        if (contentHashes.has(hash)) {
          duplicates++;
        } else {
          contentHashes.add(hash);
        }
      });
      
      console.log(`- Unique content hashes: ${contentHashes.size}`);
      console.log(`- Potential duplicates: ${duplicates}`);
      console.log(`- Deduplication effectiveness: ${duplicates === 0 ? '✅ Perfect' : `⚠️ ${duplicates} duplicates found`}`);

      // Test per-source caps
      console.log(`\n🎯 PER-SOURCE CAPS ANALYSIS:`);
      const sourceTypeCaps = {
        'apiSpec': 2,
        'apiSpecFull': 1,
        'module_documentation': 3,
        'github-file': 8,
        'architecture_documentation': 2
      };

      Object.entries(typeDistribution).forEach(([type, count]) => {
        const cap = sourceTypeCaps[type] || 5;
        const status = count <= cap ? '✅' : '⚠️';
        console.log(`  - ${type}: ${count}/${cap} ${status}`);
        
        if (count > cap) {
          console.log(`    WARNING: Exceeded cap by ${count - cap} chunks`);
        }
      });

      return {
        query,
        totalChunks: searchResults.length,
        sourceDistribution,
        typeDistribution,
        searchDuration,
        duplicates,
        results: searchResults
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error testing query "${query}":`, error.message);
      console.error('Stack trace:', error.stack);
      return null;
    }
  }

  createSimpleHash(content) {
    if (!content) return 'empty';
    const cleanContent = content.trim();
    const length = cleanContent.length;
    const start = cleanContent.substring(0, 50);
    const end = cleanContent.substring(Math.max(0, length - 50));
    return `${length}-${start}-${end}`.replace(/\s+/g, ' ');
  }

  async runAllTests() {
    console.log(`[${new Date().toISOString()}] 🎯 Starting comprehensive chunk retrieval testing...`);
    
    const results = [];
    
    for (const query of this.testQueries) {
      const result = await this.testChunkRetrieval(query);
      if (result) {
        results.push(result);
      }
      
      // Wait a bit between queries to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Summary analysis
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 OVERALL TEST RESULTS SUMMARY`);
    console.log(`${'='.repeat(80)}`);

    if (results.length === 0) {
      console.log(`❌ No successful test results!`);
      return;
    }

    const totalQueries = results.length;
    const avgChunks = results.reduce((sum, r) => sum + r.totalChunks, 0) / totalQueries;
    const avgDuration = results.reduce((sum, r) => sum + r.searchDuration, 0) / totalQueries;
    const totalDuplicates = results.reduce((sum, r) => sum + r.duplicates, 0);

    console.log(`\n📈 Performance Metrics:`);
    console.log(`- Total queries tested: ${totalQueries}`);
    console.log(`- Average chunks per query: ${avgChunks.toFixed(1)}`);
    console.log(`- Average search duration: ${avgDuration.toFixed(0)}ms`);
    console.log(`- Total duplicates found: ${totalDuplicates}`);

    // Analyze source type patterns across all queries
    console.log(`\n🏷️ Source Type Patterns Across All Queries:`);
    const allTypes = {};
    results.forEach(result => {
      Object.entries(result.typeDistribution).forEach(([type, count]) => {
        allTypes[type] = (allTypes[type] || 0) + count;
      });
    });

    Object.entries(allTypes)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, totalCount]) => {
        const avgPerQuery = (totalCount / totalQueries).toFixed(1);
        console.log(`  - ${type}: ${totalCount} total (${avgPerQuery} avg per query)`);
      });

    console.log(`\n✅ Testing completed successfully!`);
    console.log(`🎯 Fixes effectiveness:`);
    console.log(`  - Deduplication: ${totalDuplicates === 0 ? '✅ Working perfectly' : `⚠️ ${totalDuplicates} duplicates still found`}`);
    console.log(`  - Per-source caps: ${this.evaluateSourceCaps(allTypes, totalQueries)}`);
    console.log(`  - Strategy filters: ${avgChunks > 0 ? '✅ Retrieving chunks successfully' : '❌ No chunks retrieved'}`);
  }

  evaluateSourceCaps(allTypes, totalQueries) {
    const sourceTypeCaps = {
      'apiSpec': 2,
      'apiSpecFull': 1,
      'module_documentation': 3,
      'github-file': 8,
      'architecture_documentation': 2
    };

    let violations = 0;
    Object.entries(allTypes).forEach(([type, totalCount]) => {
      const cap = sourceTypeCaps[type] || 5;
      const avgPerQuery = totalCount / totalQueries;
      if (avgPerQuery > cap) {
        violations++;
      }
    });

    return violations === 0 ? '✅ Working as expected' : `⚠️ ${violations} cap violations found`;
  }
}

// Main execution
async function main() {
  const tester = new ChunkRetrievalTester();
  
  console.log(`[${new Date().toISOString()}] 🔧 Chunk Retrieval Testing Tool`);
  console.log(`[${new Date().toISOString()}] 📋 Testing fixes: deduplication, per-source caps, strategy filters`);
  
  const initialized = await tester.initialize();
  if (!initialized) {
    console.error(`[${new Date().toISOString()}] ❌ Failed to initialize tester`);
    process.exit(1);
  }

  await tester.runAllTests();
}

// Handle errors gracefully
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the test
if (require.main === module) {
  main().catch(error => {
    console.error(`[${new Date().toISOString()}] ❌ Test execution failed:`, error);
    process.exit(1);
  });
}