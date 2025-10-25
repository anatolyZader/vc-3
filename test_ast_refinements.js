#!/usr/bin/env node

/**
 * Test script for AST splitter refinements:
 * 1. Brace balance over strings fix
 * 2. Line-window token budget enforcement  
 * 3. Import prepending for semantic chunks
 * 4. Enhanced sanitizer safety
 * 5. Telemetry collection
 */

const ASTCodeSplitter = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter');

// Test cases
const testCases = [
  {
    name: "String braces test",
    code: `
const obj = { message: "Hello {world}" };
function test() {
  console.log("Braces in strings: { } [ ]");
  return { valid: true };
}
    `.trim()
  },
  {
    name: "Large function test",
    code: `
import { fastify } from 'fastify';
const express = require('express');

async function processLargeData(input) {
  console.log("Processing started");
  const results = [];
  
  for (let i = 0; i < input.length; i++) {
    const item = input[i];
    if (item.valid) {
      results.push({
        id: item.id,
        processed: true,
        timestamp: new Date().toISOString(),
        details: {
          method: 'standard',
          priority: item.priority || 'normal',
          metadata: item.metadata || {}
        }
      });
    }
  }
  
  console.warn("Processing completed with", results.length, "items");
  return { success: true, data: results };
}

export default processLargeData;
    `.trim()
  },
  {
    name: "Route with nested logs",
    code: `
const fastify = require('fastify')();

fastify.get('/api/users/:id', async (request, reply) => {
  console.log('Route hit: /api/users/' + request.params.id);
  
  try {
    const user = await getUserById(request.params.id);
    console.info('User retrieved successfully');
    return { user };
  } catch (error) {
    console.error('Failed to get user:', error);
    reply.status(500);
    return { error: 'Internal server error' };
  }
});
    `.trim(),
    metadata: { source: '/api/routes/users.js' }
  }
];

async function runTests() {
  console.log('🧪 Testing AST Splitter Refinements\n');
  
  const splitter = new ASTCodeSplitter({
    maxTokens: 400, // Lower for testing token budget
    collectTelemetry: true
  });

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log('─'.repeat(50));
    
    try {
      const chunks = splitter.split(testCase.code, testCase.metadata || {});
      
      console.log(`✅ Generated ${chunks.length} chunks`);
      
      chunks.forEach((chunk, i) => {
        console.log(`\nChunk ${i + 1}:`);
        console.log(`  Type: ${chunk.metadata.splitting}`);
        console.log(`  Tokens: ${chunk.metadata.tokenCount}`);
        console.log(`  Has imports: ${chunk.metadata.hasPrependedImports || false}`);
        
        // Test brace balance
        const isBalanced = isBalancedBracesTest(chunk.pageContent);
        console.log(`  Balanced: ${isBalanced ? '✅' : '❌'}`);
        
        // Show partial content
        const preview = chunk.pageContent.substring(0, 100).replace(/\n/g, ' ');
        console.log(`  Preview: ${preview}${chunk.pageContent.length > 100 ? '...' : ''}`);
      });
      
      // Show telemetry if available
      const lastChunk = chunks[chunks.length - 1];
      if (lastChunk?.metadata?.splitTelemetry) {
        console.log('\n📊 Split Telemetry:');
        const tel = lastChunk.metadata.splitTelemetry;
        console.log(`  Total chunks: ${tel.totalChunks}`);
        console.log(`  Splitting types:`, tel.splittingTypes);
        console.log(`  Token stats: mean=${tel.tokenStats.mean}, p95=${tel.tokenStats.p95}`);
        console.log(`  Complete blocks: ${tel.balanceStats.completeBlocksPercentage}%`);
        console.log(`  Balanced chunks: ${tel.balanceStats.balancedChunksPercentage}%`);
      }
      
    } catch (error) {
      console.error(`❌ Test failed:`, error.message);
    }
  }
}

// Helper function to test brace balance (copy of internal logic)
function stripStrings(s) { 
  return s.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, ''); 
}

function isBalancedBracesTest(s) {
  s = stripStrings(s);
  let b=0,p=0,c=0;
  for (const ch of s) {
    if (ch === '{') b++; else if (ch === '}') b--;
    if (ch === '(') p++; else if (ch === ')') p--;
    if (ch === '[') c++; else if (ch === ']') c--;
  }
  return b===0 && p===0 && c===0;
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}