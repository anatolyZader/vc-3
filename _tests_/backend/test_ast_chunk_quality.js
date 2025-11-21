#!/usr/bin/env node

/**
 * Test AST splitting quality for code files
 * Verifies that chunks are semantically rich, complete, and meaningful
 */

require('dotenv').config();

const QueryPipeline = require('./business_modules/ai/infrastructure/ai/rag_pipelines/query/queryPipeline');
const VectorSearchOrchestrator = require('./business_modules/ai/infrastructure/ai/rag_pipelines/query/vectorSearchOrchestrator');
const { OpenAIEmbeddings } = require('@langchain/openai');

class ASTChunkQualityTester {
  constructor() {
    this.codeQueries = [
      "function definition",
      "class implementation", 
      "error handling",
      "authentication middleware",
      "database connection",
      "API route handler",
      "module exports",
      "constructor method"
    ];
  }

  async initialize() {
    console.log(`[${new Date().toISOString()}] 🔍 Initializing AST Chunk Quality Tester...`);
    
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
        defaultThreshold: 0.2, // Lower threshold to get more results
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

  async testASTChunkQuality() {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🧬 TESTING AST CHUNK QUALITY AND SEMANTIC COMPLETENESS`);
    console.log(`${'='.repeat(80)}`);

    const vectorStore = await this.queryPipeline.getVectorStore();
    console.log(`[${new Date().toISOString()}] 📍 Using namespace: ${vectorStore.namespace}`);

    // Enable detailed chunk logging
    process.env.RAG_ENABLE_CHUNK_LOGGING = 'true';

    const allChunks = [];
    let totalQueries = 0;

    for (const query of this.codeQueries) {
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

        console.log(`📊 Found ${searchResults.length} chunks for "${query}"`);
        
        if (searchResults.length > 0) {
          // Analyze first few chunks for this query
          const chunksToAnalyze = searchResults.slice(0, 3);
          console.log(`\n🔬 ANALYZING TOP 3 CHUNKS FOR SEMANTIC QUALITY:`);
          
          chunksToAnalyze.forEach((chunk, index) => {
            console.log(`\n--- Chunk ${index + 1} Analysis ---`);
            const quality = this.analyzeChunkQuality(chunk, query);
            console.log(`Source: ${chunk.metadata?.source || 'Unknown'}`);
            console.log(`Type: ${chunk.metadata?.type || 'Unknown'}`);
            console.log(`Size: ${chunk.pageContent?.length || 0} characters`);
            console.log(`Score: ${chunk.metadata?.score || 'N/A'}`);
            console.log(`Quality Assessment: ${quality.overall}`);
            console.log(`Completeness: ${quality.completeness}`);
            console.log(`Semantic Richness: ${quality.semanticRichness}`);
            console.log(`Code Structure: ${quality.codeStructure}`);
            
            if (quality.issues.length > 0) {
              console.log(`⚠️ Issues Found:`);
              quality.issues.forEach(issue => console.log(`  - ${issue}`));
            }
            
            if (quality.strengths.length > 0) {
              console.log(`✅ Strengths:`);
              quality.strengths.forEach(strength => console.log(`  - ${strength}`));
            }
            
            // Show a preview of the content
            console.log(`\n📋 Content Preview (first 300 chars):`);
            console.log(`${(chunk.pageContent || '').substring(0, 300)}...`);
          });

          allChunks.push(...chunksToAnalyze);
        }

        totalQueries++;
        
        // Wait between queries
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error testing query "${query}":`, error.message);
      }
    }

    // Overall analysis
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 OVERALL AST CHUNK QUALITY ANALYSIS`);
    console.log(`${'='.repeat(80)}`);

    if (allChunks.length === 0) {
      console.log(`❌ No chunks retrieved for analysis!`);
      return;
    }

    const qualityStats = this.calculateOverallQuality(allChunks);
    
    console.log(`\n📈 Quality Statistics:`);
    console.log(`- Total chunks analyzed: ${allChunks.length}`);
    console.log(`- Average chunk size: ${qualityStats.avgSize} characters`);
    console.log(`- Complete functions/classes: ${qualityStats.completeStructures}/${allChunks.length} (${Math.round(qualityStats.completeStructures/allChunks.length*100)}%)`);
    console.log(`- Chunks with meaningful context: ${qualityStats.meaningfulContext}/${allChunks.length} (${Math.round(qualityStats.meaningfulContext/allChunks.length*100)}%)`);
    console.log(`- Semantic coherence score: ${qualityStats.semanticCoherence.toFixed(2)}/5.0`);

    console.log(`\n🏷️ Content Type Distribution:`);
    Object.entries(qualityStats.contentTypes).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count} chunks`);
    });

    console.log(`\n🎯 AST Splitting Quality Assessment:`);
    
    if (qualityStats.completeStructures / allChunks.length > 0.7) {
      console.log(`✅ EXCELLENT: AST splitting preserves code structure well`);
    } else if (qualityStats.completeStructures / allChunks.length > 0.5) {
      console.log(`✅ GOOD: AST splitting mostly preserves code structure`);
    } else {
      console.log(`⚠️ NEEDS IMPROVEMENT: AST splitting fragments code structures`);
    }

    if (qualityStats.semanticCoherence > 4.0) {
      console.log(`✅ EXCELLENT: Chunks are semantically coherent and meaningful`);
    } else if (qualityStats.semanticCoherence > 3.0) {
      console.log(`✅ GOOD: Chunks have good semantic coherence`);
    } else {
      console.log(`⚠️ NEEDS IMPROVEMENT: Chunks lack semantic coherence`);
    }

    console.log(`\n🔧 Recommendations:`);
    const recommendations = this.generateQualityRecommendations(qualityStats, allChunks);
    recommendations.forEach(rec => console.log(`  - ${rec}`));

    return qualityStats;
  }

  analyzeChunkQuality(chunk, query) {
    const content = chunk.pageContent || '';
    const issues = [];
    const strengths = [];
    
    // Check completeness
    let completeness = 'Unknown';
    let codeStructure = 'Unknown';
    let semanticRichness = 'Unknown';
    
    if (content.includes('function ') || content.includes('const ') || content.includes('class ')) {
      // Check if functions/classes are complete
      const openBraces = (content.match(/\{/g) || []).length;
      const closeBraces = (content.match(/\}/g) || []).length;
      
      if (openBraces === closeBraces && openBraces > 0) {
        completeness = 'Complete';
        strengths.push('Balanced braces - likely complete code structure');
      } else if (openBraces > 0 || closeBraces > 0) {
        completeness = 'Partial';
        issues.push('Unbalanced braces - may be fragmented code');
      }
      
      // Check for function signatures
      if (content.includes('function ') || content.includes('=>') || content.includes('async ')) {
        codeStructure = 'Function-based';
        strengths.push('Contains function definitions');
      }
      
      // Check for class structures
      if (content.includes('class ') || content.includes('constructor')) {
        codeStructure = 'Class-based';
        strengths.push('Contains class definitions');
      }
      
      // Check for meaningful variable names and comments
      const meaningfulNames = content.match(/[a-zA-Z_][a-zA-Z0-9_]{3,}/g);
      const comments = (content.match(/\/\*[\s\S]*?\*\/|\/\/.*/g) || []).length;
      
      if (meaningfulNames && meaningfulNames.length > 3) {
        semanticRichness = 'High';
        strengths.push('Contains meaningful variable/function names');
      } else {
        semanticRichness = 'Low';
        issues.push('Limited meaningful identifiers');
      }
      
      if (comments > 0) {
        strengths.push(`Contains ${comments} comments for context`);
      }
      
    } else if (content.includes('module.exports') || content.includes('require(') || content.includes('import ')) {
      codeStructure = 'Module-based';
      completeness = 'Structural';
      semanticRichness = 'Medium';
      strengths.push('Contains module structure');
    } else if (content.length < 50) {
      completeness = 'Fragment';
      issues.push('Very short chunk - likely incomplete');
    } else {
      completeness = 'Unknown structure';
      codeStructure = 'Mixed/Other';
    }
    
    // Check relevance to query
    const queryWords = query.toLowerCase().split(' ');
    const contentLower = content.toLowerCase();
    const relevantWords = queryWords.filter(word => contentLower.includes(word));
    
    if (relevantWords.length > 0) {
      strengths.push(`Relevant to query: matches ${relevantWords.length}/${queryWords.length} terms`);
    } else {
      issues.push('Limited relevance to search query');
    }
    
    // Overall assessment
    let overall = 'Poor';
    if (strengths.length > 2 && issues.length === 0) {
      overall = 'Excellent';
    } else if (strengths.length > issues.length) {
      overall = 'Good';
    } else if (strengths.length === issues.length) {
      overall = 'Fair';
    }
    
    return {
      overall,
      completeness,
      codeStructure,
      semanticRichness,
      issues,
      strengths
    };
  }

  calculateOverallQuality(chunks) {
    let totalSize = 0;
    let completeStructures = 0;
    let meaningfulContext = 0;
    let semanticScoreSum = 0;
    const contentTypes = {};
    
    chunks.forEach(chunk => {
      const quality = this.analyzeChunkQuality(chunk, 'general');
      
      totalSize += chunk.pageContent?.length || 0;
      
      if (quality.completeness === 'Complete' || quality.completeness === 'Structural') {
        completeStructures++;
      }
      
      if (quality.strengths.length > quality.issues.length) {
        meaningfulContext++;
      }
      
      // Score semantic quality (1-5 scale)
      let semanticScore = 1;
      if (quality.semanticRichness === 'High') semanticScore += 2;
      else if (quality.semanticRichness === 'Medium') semanticScore += 1;
      
      if (quality.completeness === 'Complete') semanticScore += 1;
      if (quality.issues.length === 0) semanticScore += 1;
      
      semanticScoreSum += Math.min(semanticScore, 5);
      
      // Track content types
      const type = quality.codeStructure;
      contentTypes[type] = (contentTypes[type] || 0) + 1;
    });
    
    return {
      avgSize: Math.round(totalSize / chunks.length),
      completeStructures,
      meaningfulContext,
      semanticCoherence: semanticScoreSum / chunks.length,
      contentTypes
    };
  }

  generateQualityRecommendations(stats, chunks) {
    const recommendations = [];
    
    if (stats.completeStructures / chunks.length < 0.5) {
      recommendations.push('Consider adjusting AST splitting to preserve complete functions/classes');
      recommendations.push('Review chunk size limits to ensure semantic units are not fragmented');
    }
    
    if (stats.semanticCoherence < 3.0) {
      recommendations.push('Improve semantic coherence by keeping related code together');
      recommendations.push('Consider context-aware splitting that understands code relationships');
    }
    
    if (stats.avgSize < 200) {
      recommendations.push('Chunks may be too small - consider increasing minimum chunk size');
    } else if (stats.avgSize > 2000) {
      recommendations.push('Chunks may be too large - consider decreasing maximum chunk size');
    }
    
    if (stats.contentTypes['Unknown structure'] > chunks.length * 0.3) {
      recommendations.push('Many chunks have unrecognized structure - review AST parsing logic');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('AST splitting quality is excellent - maintain current configuration');
    }
    
    return recommendations;
  }
}

// Main execution
async function main() {
  const tester = new ASTChunkQualityTester();
  
  console.log(`[${new Date().toISOString()}] 🧬 AST Chunk Quality Testing Tool`);
  console.log(`[${new Date().toISOString()}] 📋 Testing semantic completeness and code structure preservation`);
  
  const initialized = await tester.initialize();
  if (!initialized) {
    console.error(`[${new Date().toISOString()}] ❌ Failed to initialize tester`);
    process.exit(1);
  }

  await tester.testASTChunkQuality();
}

// Run the test
if (require.main === module) {
  main().catch(error => {
    console.error(`[${new Date().toISOString()}] ❌ Test execution failed:`, error);
    process.exit(1);
  });
}