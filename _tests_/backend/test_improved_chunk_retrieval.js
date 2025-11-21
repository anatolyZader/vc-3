#!/usr/bin/env node

/**
 * Test if the improved AST splitter produces better chunks for RAG retrieval
 * This tests the end-to-end impact on your actual RAG pipeline
 */

require('dotenv').config();

const QueryPipeline = require('./business_modules/ai/infrastructure/ai/rag_pipelines/query/queryPipeline');
const VectorSearchOrchestrator = require('./business_modules/ai/infrastructure/ai/rag_pipelines/query/vectorSearchOrchestrator');
const { OpenAIEmbeddings } = require('@langchain/openai');

class ImprovedChunkRetrievalTester {
  constructor() {
    this.testQueries = [
      "function implementation with complete code structure",
      "authentication controller methods",
      "route handler with middleware",
      "class constructor and methods",
      "module exports and imports",
      "error handling implementation"
    ];
  }

  async initialize() {
    console.log(`[${new Date().toISOString()}] 🔍 Initializing Improved Chunk Retrieval Tester...`);
    
    try {
      const embeddings = new OpenAIEmbeddings({
        model: 'text-embedding-3-large',
        apiKey: process.env.OPENAI_API_KEY
      });

      const vectorSearchOrchestrator = new VectorSearchOrchestrator({
        embeddings: embeddings,
        apiKey: process.env.PINECONE_API_KEY,
        indexName: process.env.PINECONE_INDEX_NAME,
        region: process.env.PINECONE_REGION,
        defaultTopK: 30,
        defaultThreshold: 0.2,
        maxResults: 100
      });

      this.queryPipeline = new QueryPipeline({
        vectorSearchOrchestrator: vectorSearchOrchestrator,
        userId: 'd41402df-182a-41ec-8f05-153118bf2718',
        embeddings: embeddings
      });

      console.log(`[${new Date().toISOString()}] ✅ Components initialized`);
      return true;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Initialization failed:`, error.message);
      return false;
    }
  }

  async testImprovedChunkRetrieval() {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🚀 TESTING IMPROVED AST CHUNKS IN RAG PIPELINE`);
    console.log(`${'='.repeat(80)}`);

    const vectorStore = await this.queryPipeline.getVectorStore();
    console.log(`[${new Date().toISOString()}] 📍 Using namespace: ${vectorStore.namespace}`);

    // Enable detailed chunk logging
    process.env.RAG_ENABLE_CHUNK_LOGGING = 'true';

    const allResults = [];

    for (const query of this.testQueries) {
      console.log(`\n${'-'.repeat(60)}`);
      console.log(`🔍 Testing query: "${query}"`);
      console.log(`${'-'.repeat(60)}`);

      try {
        const searchResults = await this.queryPipeline.performVectorSearch(
          query,
          vectorStore,
          { chunks: [] },
          'd41402df-182a-41ec-8f05-153118bf2718',
          null,
          null
        );

        console.log(`📊 Retrieved ${searchResults.length} chunks`);
        
        if (searchResults.length > 0) {
          // Analyze the SEMANTIC QUALITY of retrieved chunks
          const qualityAnalysis = this.analyzeRetrievedChunkQuality(searchResults, query);
          
          console.log(`\n🧬 SEMANTIC QUALITY ANALYSIS:`);
          console.log(`  ✅ Complete code structures: ${qualityAnalysis.completeStructures}/${searchResults.length} (${Math.round(qualityAnalysis.completeStructures/searchResults.length*100)}%)`);
          console.log(`  ✅ Balanced braces: ${qualityAnalysis.balancedBraces}/${searchResults.length} (${Math.round(qualityAnalysis.balancedBraces/searchResults.length*100)}%)`);
          console.log(`  ✅ Meaningful code chunks: ${qualityAnalysis.meaningfulChunks}/${searchResults.length} (${Math.round(qualityAnalysis.meaningfulChunks/searchResults.length*100)}%)`);
          console.log(`  ✅ Semantic coherence score: ${qualityAnalysis.avgSemanticScore.toFixed(2)}/5.0`);
          console.log(`  ✅ Average completeness: ${qualityAnalysis.avgCompleteness.toFixed(2)}/1.0`);
          console.log(`  ✅ Query relevance: ${qualityAnalysis.avgRelevance.toFixed(2)}/1.0`);
          
          // Show top 2 chunks with quality assessment
          console.log(`\n🔍 TOP CHUNKS WITH QUALITY ASSESSMENT:`);
          searchResults.slice(0, 2).forEach((chunk, index) => {
            const chunkQuality = this.assessSingleChunkQuality(chunk.pageContent, query);
            
            console.log(`\n--- Chunk ${index + 1} ---`);
            console.log(`Source: ${chunk.metadata?.source || 'Unknown'}`);
            console.log(`Size: ${chunk.pageContent?.length || 0} chars`);
            console.log(`Score: ${chunk.metadata?.score || 'N/A'}`);
            console.log(`Completeness: ${chunkQuality.completeness.toFixed(2)}/1.0`);
            console.log(`Structure: ${chunkQuality.structure}`);
            console.log(`Issues: ${chunkQuality.issues.length > 0 ? chunkQuality.issues.join(', ') : 'None'}`);
            console.log(`Preview: "${chunk.pageContent.substring(0, 150)}..."`);
          });

          allResults.push({
            query,
            chunks: searchResults,
            quality: qualityAnalysis
          });
        } else {
          console.log(`⚠️ No chunks retrieved for query: "${query}"`);
        }

        // Wait between queries
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error testing query "${query}":`, error.message);
      }
    }

    // Generate overall assessment
    this.generateOverallAssessment(allResults);
    
    return allResults;
  }

  analyzeRetrievedChunkQuality(chunks, query) {
    if (chunks.length === 0) {
      return {
        completeStructures: 0,
        balancedBraces: 0,
        meaningfulChunks: 0,
        avgSemanticScore: 0,
        avgCompleteness: 0,
        avgRelevance: 0
      };
    }

    let completeStructures = 0;
    let balancedBraces = 0;
    let meaningfulChunks = 0;
    let semanticScoreSum = 0;
    let completenessSum = 0;
    let relevanceSum = 0;

    chunks.forEach(chunk => {
      const quality = this.assessSingleChunkQuality(chunk.pageContent, query);
      
      if (quality.isComplete) completeStructures++;
      if (quality.hasBalancedBraces) balancedBraces++;
      if (quality.isMeaningful) meaningfulChunks++;
      
      semanticScoreSum += quality.semanticScore;
      completenessSum += quality.completeness;
      relevanceSum += quality.relevance;
    });

    return {
      completeStructures,
      balancedBraces,
      meaningfulChunks,
      avgSemanticScore: semanticScoreSum / chunks.length,
      avgCompleteness: completenessSum / chunks.length,
      avgRelevance: relevanceSum / chunks.length
    };
  }

  assessSingleChunkQuality(content, query) {
    if (!content || content.length === 0) {
      return {
        completeness: 0,
        isComplete: false,
        hasBalancedBraces: false,
        isMeaningful: false,
        semanticScore: 0,
        relevance: 0,
        structure: 'empty',
        issues: ['empty_content']
      };
    }

    const issues = [];
    let completeness = 0.5;
    let semanticScore = 1;
    
    // Check brace balance
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    const hasBalancedBraces = openBraces === closeBraces && openBraces > 0;
    
    if (hasBalancedBraces) {
      completeness += 0.3;
      semanticScore += 1;
    } else if (openBraces !== closeBraces && openBraces > 0) {
      issues.push('unbalanced_braces');
    }

    // Check for complete function/class structures
    const hasFunction = /\b(function\s+\w+|class\s+\w+|const\s+\w+\s*=\s*(async\s+)?\(?[^)]*\)?\s*=>)/g.test(content);
    const hasMethodBody = openBraces > 0 && closeBraces > 0;
    const isComplete = hasFunction && hasMethodBody && hasBalancedBraces;
    
    if (isComplete) {
      completeness += 0.2;
      semanticScore += 1;
    }

    // Check meaningful content
    const meaningfulLines = content.split('\n').filter(line => 
      line.trim() && 
      !line.trim().startsWith('//') && 
      !line.trim().startsWith('/*') &&
      line.trim().length > 5 &&
      line.trim() !== '{' &&
      line.trim() !== '}'
    );
    
    const isMeaningful = meaningfulLines.length >= 3;
    if (isMeaningful) {
      completeness += 0.1;
      semanticScore += 1;
    } else {
      issues.push('insufficient_content');
    }

    // Check relevance to query
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const contentLower = content.toLowerCase();
    const matchingWords = queryWords.filter(word => contentLower.includes(word));
    const relevance = queryWords.length > 0 ? matchingWords.length / queryWords.length : 0;
    
    if (relevance > 0.5) {
      semanticScore += 1;
    }

    // Determine structure type
    let structure = 'unknown';
    if (/\bclass\s+\w+/g.test(content)) structure = 'class';
    else if (/\bfunction\s+\w+/g.test(content)) structure = 'function';
    else if (/\bconst\s+\w+\s*=\s*\(/g.test(content)) structure = 'arrow_function';
    else if (/\bmodule\.exports/g.test(content)) structure = 'module_export';
    else if (/\brequire\(/g.test(content)) structure = 'require';
    else if (meaningfulLines.length > 0) structure = 'code_block';

    completeness = Math.max(0, Math.min(1, completeness));
    semanticScore = Math.max(1, Math.min(5, semanticScore));

    return {
      completeness,
      isComplete,
      hasBalancedBraces,
      isMeaningful,
      semanticScore,
      relevance,
      structure,
      issues
    };
  }

  generateOverallAssessment(results) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📈 OVERALL RAG CHUNK QUALITY ASSESSMENT`);
    console.log(`${'='.repeat(80)}`);

    if (results.length === 0) {
      console.log(`❌ No results to analyze`);
      return;
    }

    // Calculate aggregate metrics
    const totalChunks = results.reduce((sum, r) => sum + r.chunks.length, 0);
    const avgCompleteStructures = results.reduce((sum, r) => sum + (r.quality.completeStructures / r.chunks.length), 0) / results.length;
    const avgBalancedBraces = results.reduce((sum, r) => sum + (r.quality.balancedBraces / r.chunks.length), 0) / results.length;
    const avgMeaningfulChunks = results.reduce((sum, r) => sum + (r.quality.meaningfulChunks / r.chunks.length), 0) / results.length;
    const avgSemanticScore = results.reduce((sum, r) => sum + r.quality.avgSemanticScore, 0) / results.length;
    const avgCompleteness = results.reduce((sum, r) => sum + r.quality.avgCompleteness, 0) / results.length;
    const avgRelevance = results.reduce((sum, r) => sum + r.quality.avgRelevance, 0) / results.length;

    console.log(`\n📊 AGGREGATE QUALITY METRICS:`);
    console.log(`- Total queries tested: ${results.length}`);
    console.log(`- Total chunks retrieved: ${totalChunks}`);
    console.log(`- Average chunks per query: ${Math.round(totalChunks / results.length)}`);
    
    console.log(`\n🎯 QUALITY SCORES:`);
    console.log(`- Complete structures: ${(avgCompleteStructures * 100).toFixed(1)}%`);
    console.log(`- Balanced braces: ${(avgBalancedBraces * 100).toFixed(1)}%`);
    console.log(`- Meaningful chunks: ${(avgMeaningfulChunks * 100).toFixed(1)}%`);
    console.log(`- Semantic coherence: ${avgSemanticScore.toFixed(2)}/5.0`);
    console.log(`- Average completeness: ${avgCompleteness.toFixed(2)}/1.0`);
    console.log(`- Query relevance: ${avgRelevance.toFixed(2)}/1.0`);

    console.log(`\n🏆 ASSESSMENT:`);
    
    const overallScore = (avgCompleteStructures + avgBalancedBraces + avgMeaningfulChunks + (avgSemanticScore/5) + avgCompleteness + avgRelevance) / 6;
    
    if (overallScore > 0.8) {
      console.log(`🚀 EXCELLENT: Your improved AST chunks show excellent quality for RAG`);
      console.log(`   - High structural completeness and semantic coherence`);
      console.log(`   - Should provide comprehensive context for AI responses`);
    } else if (overallScore > 0.6) {
      console.log(`✅ GOOD: Your improved AST chunks are well-suited for RAG`);
      console.log(`   - Good balance of completeness and relevance`);
      console.log(`   - Will provide solid context for AI responses`);
    } else if (overallScore > 0.4) {
      console.log(`⚠️ MODERATE: Your AST chunks need some improvement`);
      console.log(`   - Some fragmentation issues remain`);
      console.log(`   - Consider further tuning chunk parameters`);
    } else {
      console.log(`❌ POOR: Significant issues with AST chunk quality`);
      console.log(`   - High fragmentation affecting semantic completeness`);
      console.log(`   - Recommend reviewing splitting configuration`);
    }

    // Show best performing queries
    console.log(`\n🏅 BEST PERFORMING QUERIES:`);
    results
      .sort((a, b) => (b.quality.avgCompleteness + b.quality.avgSemanticScore/5) - (a.quality.avgCompleteness + a.quality.avgSemanticScore/5))
      .slice(0, 3)
      .forEach((result, index) => {
        console.log(`${index + 1}. "${result.query}" - Completeness: ${result.quality.avgCompleteness.toFixed(2)}, Semantic: ${result.quality.avgSemanticScore.toFixed(2)}`);
      });
  }
}

// Main execution
async function main() {
  const tester = new ImprovedChunkRetrievalTester();
  
  console.log(`[${new Date().toISOString()}] 🚀 Testing Improved AST Chunks in RAG Pipeline`);
  console.log(`[${new Date().toISOString()}] 📋 Analyzing semantic quality of retrieved chunks`);
  
  const initialized = await tester.initialize();
  if (!initialized) {
    console.error(`[${new Date().toISOString()}] ❌ Failed to initialize tester`);
    process.exit(1);
  }

  await tester.testImprovedChunkRetrieval();
}

// Run the test
if (require.main === module) {
  main().catch(error => {
    console.error(`[${new Date().toISOString()}] ❌ Test execution failed:`, error);
    process.exit(1);
  });
}