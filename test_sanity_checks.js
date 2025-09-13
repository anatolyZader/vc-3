#!/usr/bin/env node
"use strict";

// Comprehensive sanity checks for all patched components
const fs = require('fs');
const path = require('path');

// Mock dependencies to avoid complex imports
class MockCodePreprocessor {
  async preprocessCodeFile(content, source, metadata) {
    return {
      content: content,
      metadata: { preprocessed: true },
      preprocessingApplied: { code_cleaning: true }
    };
  }
}

class MockTextPreprocessor {
  async preprocessTextFile(content, source, metadata) {
    return {
      content: content,
      metadata: { preprocessed: true },
      preprocessingApplied: { text_cleaning: true }
    };
  }
}

class MockChunkPostprocessor {
  async postprocessChunks(chunks, document) {
    return chunks.map(chunk => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        postprocessed: true
      }
    }));
  }
}

class MockTokenBasedSplitter {
  constructor(options) {
    this.maxTokens = options.maxTokens || 1400;
    this.minTokens = options.minTokens || 120;
    this.overlapTokens = options.overlapTokens || 180;
  }
}

class MockEnhancedASTCodeSplitter {
  async splitDocument(document) {
    return [{
      pageContent: document.pageContent.substring(0, 500),
      metadata: {
        ...document.metadata,
        chunk_type: 'ast_code_chunk',
        splitting_method: 'ast_enhanced'
      }
    }];
  }
}

class MockMarkdownDocumentationProcessor {}

// Mock langchain splitters
const MockRecursiveCharacterTextSplitter = class {
  constructor(options) {
    this.chunkSize = options.chunkSize;
    this.chunkOverlap = options.chunkOverlap;
  }
  
  async splitDocuments(documents) {
    return documents.map(doc => ({
      pageContent: doc.pageContent.substring(0, this.chunkSize),
      metadata: {
        ...doc.metadata,
        chunk_type: 'text_chunk'
      }
    }));
  }
};

const MockMarkdownTextSplitter = class {
  constructor(options) {
    this.chunkSize = options.chunkSize;
    this.chunkOverlap = options.chunkOverlap;
  }
  
  async splitDocuments(documents) {
    return documents.map(doc => ({
      pageContent: doc.pageContent.substring(0, this.chunkSize),
      metadata: {
        ...doc.metadata,
        chunk_type: 'markdown_chunk'
      }
    }));
  }
};

// Override require for our tests
const originalRequire = require;
function mockRequire(modulePath) {
  switch(modulePath) {
    case './EnhancedASTCodeSplitter':
      return MockEnhancedASTCodeSplitter;
    case './markdownDocumentationProcessor':
      return MockMarkdownDocumentationProcessor;
    case './TokenBasedSplitter':
      return MockTokenBasedSplitter;
    case './CodePreprocessor':
      return MockCodePreprocessor;
    case './TextPreprocessor':
      return MockTextPreprocessor;
    case './ChunkPostprocessor':
      return MockChunkPostprocessor;
    case 'langchain/text_splitter':
      return {
        RecursiveCharacterTextSplitter: MockRecursiveCharacterTextSplitter,
        MarkdownTextSplitter: MockMarkdownTextSplitter
      };
    default:
      return originalRequire(modulePath);
  }
}

// Temporarily override require
require = mockRequire;

// Now load the ContentAwareSplitterRouter
const ContentAwareSplitterRouter = originalRequire('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/processors/ContentAwareSplitterRouter.js');

// Restore original require
require = originalRequire;

async function testContentTypeRouting() {
  console.log('\n🧪 TESTING: Content Type Detection & Routing');
  console.log('='.repeat(60));
  
  const router = new ContentAwareSplitterRouter();
  
  const testCases = [
    // Code files
    { source: 'app.js', content: 'function test() { return true; }', expected: 'code' },
    { source: 'component.tsx', content: 'export const Component = () => <div></div>;', expected: 'code' },
    { source: 'utils.py', content: 'def hello(): return "world"', expected: 'code' },
    
    // Markdown
    { source: 'README.md', content: '# Project\n\nDescription', expected: 'markdown' },
    { source: 'docs.markdown', content: '## API Guide', expected: 'markdown' },
    
    // OpenAPI
    { source: 'openapi.yaml', content: 'openapi: 3.0.0\npaths:\n  /users:', expected: 'openapi' },
    { source: 'swagger.json', content: '{"swagger": "2.0", "paths": {}}', expected: 'openapi' },
    { source: 'api-spec.json', content: '{"openapi": "3.0.0"}', expected: 'openapi' },
    
    // JSON Schema
    { source: 'user.schema.json', content: '{"$schema": "http://json-schema.org/draft-07/schema#"}', expected: 'json_schema' },
    { source: 'config-schema.json', content: '{"type": "object", "properties": {"name": {}}}', expected: 'json_schema' },
    
    // YAML Config
    { source: 'config.yml', content: 'database:\n  host: localhost', expected: 'yaml_config' },
    { source: 'docker-compose.yaml', content: 'version: "3.8"', expected: 'yaml_config' },
    
    // JSON Config
    { source: 'package.json', content: '{"name": "test", "version": "1.0.0"}', expected: 'json_config' },
    { source: 'tsconfig.json', content: '{"compilerOptions": {}}', expected: 'json_config' },
    
    // Documentation
    { source: 'README.txt', content: 'This is a readme file', expected: 'documentation' },
    { source: 'CHANGELOG.rst', content: 'Release Notes', expected: 'documentation' },
    
    // Generic
    { source: 'data.xml', content: '<root><item>test</item></root>', expected: 'generic' },
    { source: 'notes.log', content: 'Log entry 1\nLog entry 2', expected: 'generic' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    const document = {
      pageContent: testCase.content,
      metadata: { source: testCase.source }
    };
    
    const detected = router.detectContentType(document);
    
    if (detected === testCase.expected) {
      console.log(`✅ ${testCase.source.padEnd(20)} → ${detected}`);
      passed++;
    } else {
      console.log(`❌ ${testCase.source.padEnd(20)} → ${detected} (expected: ${testCase.expected})`);
      failed++;
    }
  }
  
  console.log(`\n📊 Content Type Detection: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

async function testSplitDocumentFlow() {
  console.log('\n🧪 TESTING: splitDocument() Happy Path Flow');
  console.log('='.repeat(60));
  
  const router = new ContentAwareSplitterRouter();
  
  const testDocuments = [
    {
      name: 'JavaScript Code',
      document: {
        pageContent: 'function calculate(a, b) {\n  return a + b;\n}\n\nmodule.exports = calculate;',
        metadata: { source: 'calculator.js' }
      }
    },
    {
      name: 'Markdown Documentation',
      document: {
        pageContent: '# User Guide\n\n## Installation\n\nRun `npm install`\n\n## Usage\n\nImport the module',
        metadata: { source: 'guide.md' }
      }
    },
    {
      name: 'OpenAPI Specification',
      document: {
        pageContent: '{"openapi": "3.0.0", "paths": {"/users": {"get": {"summary": "Get users"}}}}',
        metadata: { source: 'api.json' }
      }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testDocuments) {
    try {
      console.log(`\n🔄 Testing: ${test.name}`);
      
      const chunks = await router.splitDocument(test.document);
      
      // Verify chunks structure
      if (!Array.isArray(chunks)) {
        throw new Error('Result is not an array');
      }
      
      if (chunks.length === 0) {
        throw new Error('No chunks produced');
      }
      
      // Verify each chunk has required structure
      for (const chunk of chunks) {
        if (!chunk.pageContent) {
          throw new Error('Chunk missing pageContent');
        }
        if (!chunk.metadata) {
          throw new Error('Chunk missing metadata');
        }
        if (!chunk.metadata.postprocessed) {
          throw new Error('Chunk not postprocessed');
        }
      }
      
      console.log(`✅ ${test.name}: ${chunks.length} chunks with complete processing pipeline`);
      passed++;
      
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 splitDocument() Flow: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

async function testErrorHandling() {
  console.log('\n🧪 TESTING: Error Handling & Fallback');
  console.log('='.repeat(60));
  
  const router = new ContentAwareSplitterRouter();
  
  // Test fallbackSplit directly
  const testDocument = {
    pageContent: 'This is test content that should be split using fallback method when routing fails.',
    metadata: { source: 'test.txt' }
  };
  
  try {
    console.log('🔄 Testing fallbackSplit() method...');
    
    const chunks = await router.fallbackSplit(testDocument);
    
    if (!Array.isArray(chunks)) {
      throw new Error('fallbackSplit did not return array');
    }
    
    if (chunks.length === 0) {
      throw new Error('fallbackSplit returned no chunks');
    }
    
    const chunk = chunks[0];
    if (!chunk.pageContent || !chunk.metadata) {
      throw new Error('fallbackSplit chunk malformed');
    }
    
    if (!chunk.metadata.splitting_method || !chunk.metadata.chunk_type) {
      throw new Error('fallbackSplit chunk missing required metadata');
    }
    
    console.log(`✅ fallbackSplit(): ${chunks.length} chunks with proper metadata`);
    console.log(`   - chunk_type: ${chunk.metadata.chunk_type}`);
    console.log(`   - splitting_method: ${chunk.metadata.splitting_method}`);
    
    return true;
    
  } catch (error) {
    console.log(`❌ fallbackSplit(): ${error.message}`);
    return false;
  }
}

async function testFileFilteringUtils() {
  console.log('\n🧪 TESTING: FileFilteringUtils Integrity');
  console.log('='.repeat(60));
  
  try {
    // Check if FileFilteringUtils exists and is not corrupted
    const filePath = './backend/business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/utils/FileFilteringUtils.js';
    
    if (!fs.existsSync(filePath)) {
      throw new Error('FileFilteringUtils.js not found');
    }
    
    // Test syntax
    console.log('🔄 Checking FileFilteringUtils syntax...');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Basic corruption checks
    if (content.includes('filterDocuments')) {
      console.log('✅ filterDocuments method found');
    } else {
      throw new Error('filterDocuments method missing');
    }
    
    if (content.includes('fs.rm') && !content.includes('fs.rmdir')) {
      console.log('✅ Uses modern fs.rm API');
    } else {
      console.log('⚠️  Check fs API usage');
    }
    
    // Try to require it (syntax check)
    try {
      require(filePath);
      console.log('✅ FileFilteringUtils loads without syntax errors');
    } catch (err) {
      throw new Error(`Syntax error in FileFilteringUtils: ${err.message}`);
    }
    
    return true;
    
  } catch (error) {
    console.log(`❌ FileFilteringUtils: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 COMPREHENSIVE SANITY CHECKS');
  console.log('=' * 60);
  
  const results = [];
  
  results.push(await testContentTypeRouting());
  results.push(await testSplitDocumentFlow());
  results.push(await testErrorHandling());
  results.push(await testFileFilteringUtils());
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(60));
  console.log(`📋 FINAL RESULTS: ${passed}/${total} test suites passed`);
  
  if (passed === total) {
    console.log('🎉 ALL SANITY CHECKS PASSED! System ready for production.');
  } else {
    console.log('⚠️  Some tests failed. Review issues above.');
  }
  
  return passed === total;
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };
