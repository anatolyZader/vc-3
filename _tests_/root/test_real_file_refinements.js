#!/usr/bin/env node

/**
 * Test AST splitter refinements with a real codebase file
 */

const fs = require('fs');
const ASTCodeSplitter = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter');

async function testRealFile() {
  console.log('🧪 Testing AST Splitter Refinements with Real File\n');
  
  // Test with the aiController.js file that we know has complex structures
  const testFiles = [
    './backend/business_modules/ai/aiController.js',
    './backend/business_modules/ai/aiService.js'
  ];
  
  const splitter = new ASTCodeSplitter({
    maxTokens: 1500,
    collectTelemetry: true
  });

  for (const filePath of testFiles) {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        continue;
      }
      
      const code = fs.readFileSync(filePath, 'utf-8');
      console.log(`\n📄 Processing: ${filePath}`);
      console.log(`   File size: ${code.length} chars`);
      console.log('─'.repeat(60));
      
      const chunks = splitter.split(code, { 
        source: filePath,
        collectTelemetry: true 
      });
      
      console.log(`✅ Generated ${chunks.length} chunks`);
      
      // Show summary of each chunk
      chunks.forEach((chunk, i) => {
        console.log(`\nChunk ${i + 1}:`);
        console.log(`  Type: ${chunk.metadata.splitting}`);
        console.log(`  Tokens: ${chunk.metadata.tokenCount}`);
        console.log(`  Has imports: ${chunk.metadata.hasPrependedImports || false}`);
        
        if (chunk.metadata.unit) {
          console.log(`  Unit: ${chunk.metadata.unit.type} "${chunk.metadata.unit.name}"`);
        }
        
        if (chunk.metadata.unitCount > 1) {
          console.log(`  Units packed: ${chunk.metadata.unitCount}`);
        }
        
        // Test string-aware brace balance
        const rawBalance = testRawBraces(chunk.pageContent);
        const refinedBalance = testRefinedBraces(chunk.pageContent);
        console.log(`  Balance (raw/refined): ${rawBalance ? '✅' : '❌'}/${refinedBalance ? '✅' : '❌'}`);
        
        // Show preview
        const lines = chunk.pageContent.split('\n');
        const preview = lines.slice(0, 2).join(' ').substring(0, 80);
        console.log(`  Preview: ${preview}${chunk.pageContent.length > 80 ? '...' : ''}`);
      });
      
      // Show telemetry
      const lastChunk = chunks[chunks.length - 1];
      if (lastChunk?.metadata?.splitTelemetry) {
        console.log('\n📊 Split Telemetry:');
        const tel = lastChunk.metadata.splitTelemetry;
        console.log(`  Total chunks: ${tel.totalChunks}`);
        console.log(`  Splitting distribution:`);
        Object.entries(tel.splittingTypes).forEach(([type, stats]) => {
          console.log(`    ${type}: ${stats.count} (${stats.percentage}%)`);
        });
        console.log(`  Token stats: mean=${tel.tokenStats.mean}, max=${tel.tokenStats.max}, p95=${tel.tokenStats.p95}`);
        console.log(`  Complete blocks: ${tel.balanceStats.completeBlocksPercentage}%`);
        console.log(`  Balanced chunks: ${tel.balanceStats.balancedChunksPercentage}%`);
        console.log(`  Chunks with imports: ${tel.importStats.chunksWithImports}`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }
}

// Test functions for brace balance comparison
function testRawBraces(s) {
  let b=0,p=0,c=0;
  for (const ch of s) {
    if (ch === '{') b++; else if (ch === '}') b--;
    if (ch === '(') p++; else if (ch === ')') p--;
    if (ch === '[') c++; else if (ch === ']') c--;
  }
  return b===0 && p===0 && c===0;
}

function stripStrings(s) { 
  return s.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, ''); 
}

function testRefinedBraces(s) {
  s = stripStrings(s);
  let b=0,p=0,c=0;
  for (const ch of s) {
    if (ch === '{') b++; else if (ch === '}') b--;
    if (ch === '(') p++; else if (ch === ')') p--;
    if (ch === '[') c++; else if (ch === ']') c--;
  }
  return b===0 && p===0 && c===0;
}

if (require.main === module) {
  testRealFile().catch(console.error);
}