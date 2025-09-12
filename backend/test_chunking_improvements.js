// test_chunking_improvements.js
"use strict";

const ChunkingImprovementPipeline = require('./business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/processors/ChunkingImprovementPipeline');
const ChunkQualityAnalyzer = require('./business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/analyzers/ChunkQualityAnalyzer');
const EnhancedASTCodeSplitter = require('./business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/processors/EnhancedASTCodeSplitter');

/**
 * Test script to demonstrate the chunking improvement pipeline
 */
async function testChunkingImprovements() {
  console.log('🚀 Testing Chunking Improvement Pipeline');
  console.log('======================================');

  try {
    // Initialize the pipeline
    const pipeline = new ChunkingImprovementPipeline();
    
    // Test individual components first
    await testChunkQualityAnalyzer();
    await testEnhancedASTSplitter();
    
    // Run the full improvement pipeline
    console.log('\n🔄 Running Full Improvement Pipeline...');
    const report = await pipeline.runImprovementPipeline();
    
    console.log('\n✅ Pipeline Results:');
    console.log(`   Quality Score: ${report.summary.qualityScore}`);
    console.log(`   Traces Analyzed: ${report.summary.tracesAnalyzed}`);
    console.log(`   Improvements Implemented: ${report.summary.improvementsImplemented}`);
    console.log(`   Validation Passed: ${report.summary.validationPassed}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

/**
 * Test the chunk quality analyzer
 */
async function testChunkQualityAnalyzer() {
  console.log('\n📊 Testing Chunk Quality Analyzer...');
  
  const analyzer = new ChunkQualityAnalyzer();
  
  // Mock trace data based on your actual trace issues
  const mockTraceChunks = [
    {
      source: 'backend/_tests_/aop/permissions/domain/entities/policy.test.js',
      content: 'const Policy = require(\'../../../../../aop/permissions/domain/entities/policy\'); // Adjust the path as necessary',
      size: 112,
      type: 'unknown',
      metadata: {
        chunk_type: 'unknown',
        fileType: 'JavaScript'
      }
    },
    {
      source: 'backend/_tests_/aop/permissions/domain/entities/policy.test.js',
      content: 'const Policy = require(\'../../../../../aop/permissions/domain/entities/policy\'); // Adjust the path as necessary',
      size: 112,
      type: 'unknown',
      metadata: {
        chunk_type: 'unknown',
        fileType: 'JavaScript'
      }
    },
    {
      source: 'backend/business_modules/ai/application/services/aiService.js',
      content: `class AIService extends IAIService {
  constructor({ aiAdapter, aiPersistAdapter, aiMessagingAdapter }) {
    super();
    this.aiAdapter = aiAdapter;
    this.aiPersistAdapter = aiPersistAdapter;
    this.aiMessagingAdapter = aiMessagingAdapter;
  }`,
      size: 250,
      type: 'unknown',
      metadata: {
        chunk_type: 'unknown',
        fileType: 'JavaScript'
      }
    }
  ];

  const analysis = analyzer.analyzeTraceChunks(mockTraceChunks);
  
  console.log(`   Quality Score: ${analysis.qualityScore}/100`);
  console.log(`   Total Issues: ${analysis.sizingIssues.issues.length + analysis.semanticIssues.issues.length}`);
  console.log(`   Small Chunks: ${analysis.sizingIssues.tooSmall.length}`);
  console.log(`   Duplicates: ${analysis.duplicateIssues.totalDuplicates}`);
  console.log(`   Recommendations: ${analysis.recommendations.length}`);
  
  if (analysis.recommendations.length > 0) {
    console.log('   Top Recommendation:', analysis.recommendations[0].solution);
  }
}

/**
 * Test the enhanced AST splitter
 */
async function testEnhancedASTSplitter() {
  console.log('\n🌳 Testing Enhanced AST Splitter...');
  
  const splitter = new EnhancedASTCodeSplitter();
  
  // Test document with typical issues
  const testDocument = {
    pageContent: `
const Policy = require('../../../../../aop/permissions/domain/entities/policy');
const User = require('../../../../../aop/auth/domain/entities/user');

/**
 * Service for managing policies
 */
class PolicyService {
  constructor(policyRepository) {
    this.policyRepository = policyRepository;
  }
  
  /**
   * Create a new policy
   */
  async createPolicy(policyData) {
    const policy = new Policy(policyData);
    return await this.policyRepository.save(policy);
  }
  
  /**
   * Update existing policy
   */
  async updatePolicy(id, updates) {
    const policy = await this.policyRepository.findById(id);
    if (!policy) {
      throw new Error('Policy not found');
    }
    
    Object.assign(policy, updates);
    return await this.policyRepository.save(policy);
  }
  
  /**
   * Delete policy
   */
  async deletePolicy(id) {
    const policy = await this.policyRepository.findById(id);
    if (!policy) {
      throw new Error('Policy not found');
    }
    
    return await this.policyRepository.delete(id);
  }
}

module.exports = PolicyService;
    `,
    metadata: {
      source: 'services/PolicyService.js',
      fileType: 'JavaScript'
    }
  };

  const chunks = await splitter.splitDocument(testDocument);
  
  console.log(`   Input Size: ${testDocument.pageContent.length} characters`);
  console.log(`   Output Chunks: ${chunks.length}`);
  
  chunks.forEach((chunk, index) => {
    console.log(`   Chunk ${index + 1}:`);
    console.log(`     Size: ${chunk.pageContent.length} chars`);
    console.log(`     Type: ${chunk.metadata.semantic_type || 'unknown'}`);
    console.log(`     Functions: ${(chunk.metadata.function_names || []).join(', ') || 'none'}`);
    console.log(`     Has Imports: ${chunk.metadata.has_imports || false}`);
    console.log(`     Quality Optimized: ${chunk.metadata.quality_optimized || false}`);
  });
}

/**
 * Demonstrate specific improvement scenarios
 */
async function demonstrateImprovements() {
  console.log('\n🎯 Demonstrating Specific Improvements...');
  
  const scenarios = [
    {
      name: 'Small Import-Only Chunks',
      description: 'How we handle tiny chunks that are just import statements'
    },
    {
      name: 'Duplicate Content Removal',
      description: 'How we eliminate duplicate chunks'
    },
    {
      name: 'Context Enhancement',
      description: 'How we add missing import context to functions'
    },
    {
      name: 'Semantic Type Detection',
      description: 'How we properly identify chunk types (class, function, etc.)'
    }
  ];

  scenarios.forEach((scenario, index) => {
    console.log(`\n   ${index + 1}. ${scenario.name}`);
    console.log(`      ${scenario.description}`);
  });
}

// Run the tests
if (require.main === module) {
  testChunkingImprovements().then(() => {
    demonstrateImprovements();
    console.log('\n🎉 All tests completed!');
  }).catch(error => {
    console.error('❌ Test suite failed:', error);
  });
}

module.exports = {
  testChunkingImprovements,
  testChunkQualityAnalyzer,
  testEnhancedASTSplitter
};
