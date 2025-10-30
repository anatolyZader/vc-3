#!/usr/bin/env node

/**
 * Test the improved AST splitter with optimized settings
 * Verifies the 5 key improvements made to chunk quality
 */

const ASTCodeSplitter = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter');
const fs = require('fs');

class ImprovedASTSplitterTester {
  constructor() {
    // Original splitter (old settings)
    this.originalSplitter = new ASTCodeSplitter({
      maxTokens: 800,
      minTokens: 60,
      overlapTokens: 80,
      maxUnitsPerChunk: 1,
      minResidualChars: 12
    });

    // Improved splitter (new settings with all improvements)
    this.improvedSplitter = new ASTCodeSplitter(); // Uses new defaults

    this.testFiles = [
      './business_modules/ai/application/aiController.js',
      './app.js'
    ].filter(file => fs.existsSync(file));
  }

  async runTest() {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🚀 TESTING IMPROVED AST SPLITTER WITH OPTIMIZED SETTINGS`);
    console.log(`${'='.repeat(80)}`);

    for (const filePath of this.testFiles) {
      console.log(`\n${'-'.repeat(60)}`);
      console.log(`📁 Testing: ${filePath}`);
      console.log(`${'-'.repeat(60)}`);

      const sourceCode = fs.readFileSync(filePath, 'utf-8');
      console.log(`File size: ${sourceCode.length} characters`);

      // Test original splitter
      const originalResults = this.testSplitter('ORIGINAL', this.originalSplitter, sourceCode, filePath);
      
      // Test improved splitter  
      const improvedResults = this.testSplitter('IMPROVED', this.improvedSplitter, sourceCode, filePath);

      // Compare results
      this.compareResults(originalResults, improvedResults, filePath);
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ IMPROVEMENT VERIFICATION COMPLETE`);
    console.log(`${'='.repeat(80)}`);
  }

  testSplitter(name, splitter, sourceCode, filePath) {
    console.log(`\n🔧 ${name} SPLITTER SETTINGS:`);
    console.log(`  - maxTokens: ${splitter.maxTokens}`);
    console.log(`  - minTokens: ${splitter.minTokens}`);
    console.log(`  - maxUnitsPerChunk: ${splitter.maxUnitsPerChunk}`);
    console.log(`  - overlapTokens: ${splitter.overlapTokens}`);
    console.log(`  - minResidualChars: ${splitter.minResidualChars}`);

    const startTime = Date.now();
    const chunks = splitter.split(sourceCode, { source: filePath });
    const duration = Date.now() - startTime;

    const quality = this.analyzeQuality(chunks);
    
    console.log(`\n📊 ${name} RESULTS:`);
    console.log(`  - Chunks generated: ${chunks.length}`);
    console.log(`  - Processing time: ${duration}ms`);
    console.log(`  - Average size: ${quality.avgSize} chars`);
    console.log(`  - Complete structures: ${quality.completeStructures}/${chunks.length} (${Math.round(quality.completeStructures/chunks.length*100)}%)`);
    console.log(`  - Balanced braces: ${quality.balancedBraces}/${chunks.length} (${Math.round(quality.balancedBraces/chunks.length*100)}%)`);
    console.log(`  - Semantic coherence: ${quality.semanticScore.toFixed(2)}/5.0`);
    console.log(`  - Chunk types: ${JSON.stringify(quality.chunkTypes)}`);

    return { chunks, quality, duration, settings: { maxTokens: splitter.maxTokens, minTokens: splitter.minTokens, maxUnitsPerChunk: splitter.maxUnitsPerChunk } };
  }

  analyzeQuality(chunks) {
    if (chunks.length === 0) {
      return { avgSize: 0, completeStructures: 0, balancedBraces: 0, semanticScore: 0, chunkTypes: {} };
    }

    let totalSize = 0;
    let completeStructures = 0;
    let balancedBraces = 0;
    let semanticScoreSum = 0;
    const chunkTypes = {};

    chunks.forEach(chunk => {
      const content = chunk.pageContent || '';
      totalSize += content.length;

      // Check brace balance
      const openBraces = (content.match(/\{/g) || []).length;
      const closeBraces = (content.match(/\}/g) || []).length;
      
      if (openBraces === closeBraces && openBraces > 0) {
        balancedBraces++;
      }

      // Check for complete structures
      const hasFunctionDef = /\b(function\s+\w+|class\s+\w+|const\s+\w+\s*=\s*\()/g.test(content);
      if (hasFunctionDef && openBraces === closeBraces && openBraces > 0) {
        completeStructures++;
      }

      // Semantic scoring
      let score = 1;
      if (openBraces === closeBraces) score += 1;
      if (content.length > 200) score += 1;
      if (/\b(function|class|module\.exports)/g.test(content)) score += 1;
      if (content.split('\n').filter(l => l.trim() && !l.trim().startsWith('//')).length > 5) score += 1;
      
      semanticScoreSum += Math.min(score, 5);

      // Track splitting types
      const splitting = chunk.metadata?.splitting || 'unknown';
      chunkTypes[splitting] = (chunkTypes[splitting] || 0) + 1;
    });

    return {
      avgSize: Math.round(totalSize / chunks.length),
      completeStructures,
      balancedBraces,
      semanticScore: semanticScoreSum / chunks.length,
      chunkTypes
    };
  }

  compareResults(original, improved, filePath) {
    console.log(`\n📈 IMPROVEMENT ANALYSIS for ${filePath.split('/').pop()}:`);
    console.log(`${'Metric'.padEnd(25)} | ${'Original'.padEnd(12)} | ${'Improved'.padEnd(12)} | ${'Change'.padEnd(15)}`);
    console.log(`${'-'.repeat(70)}`);

    const metrics = [
      ['Chunk Count', original.chunks.length, improved.chunks.length],
      ['Avg Size (chars)', original.quality.avgSize, improved.quality.avgSize],
      ['Complete Structures', original.quality.completeStructures, improved.quality.completeStructures],
      ['Balanced Braces', original.quality.balancedBraces, improved.quality.balancedBraces],
      ['Semantic Score', original.quality.semanticScore.toFixed(2), improved.quality.semanticScore.toFixed(2)],
      ['Processing Time (ms)', original.duration, improved.duration]
    ];

    metrics.forEach(([metric, origVal, impVal]) => {
      const change = typeof origVal === 'number' && typeof impVal === 'number' 
        ? (impVal - origVal) 
        : 'N/A';
      
      const changeStr = change === 'N/A' ? 'N/A' : 
        change > 0 ? `+${change} ↗️` : 
        change < 0 ? `${change} ↘️` : '0';
      
      console.log(`${metric.padEnd(25)} | ${origVal.toString().padEnd(12)} | ${impVal.toString().padEnd(12)} | ${changeStr.padEnd(15)}`);
    });

    // Specific improvement validations
    console.log(`\n🎯 IMPROVEMENT VALIDATIONS:`);
    
    // 1. Safer defaults
    if (improved.settings.maxTokens > original.settings.maxTokens) {
      console.log(`  ✅ 1. Safer defaults: maxTokens increased ${original.settings.maxTokens} → ${improved.settings.maxTokens}`);
    }
    
    // 2. Intelligent packing
    if (improved.settings.maxUnitsPerChunk > original.settings.maxUnitsPerChunk) {
      console.log(`  ✅ 2. Intelligent packing: maxUnitsPerChunk increased ${original.settings.maxUnitsPerChunk} → ${improved.settings.maxUnitsPerChunk}`);
    }
    
    // 3. Better structure preservation
    const structuralImprovement = ((improved.quality.completeStructures / improved.chunks.length) - 
                                  (original.quality.completeStructures / original.chunks.length)) * 100;
    if (structuralImprovement > 0) {
      console.log(`  ✅ 3. Structure preservation: +${structuralImprovement.toFixed(1)}% complete structures`);
    }
    
    // 4. Balanced braces improvement
    const braceImprovement = ((improved.quality.balancedBraces / improved.chunks.length) - 
                             (original.quality.balancedBraces / original.chunks.length)) * 100;
    if (braceImprovement > 0) {
      console.log(`  ✅ 4. Brace balance: +${braceImprovement.toFixed(1)}% balanced chunks`);
    }
    
    // 5. Enhanced splitting types
    const hasEnhancedTypes = Object.keys(improved.quality.chunkTypes).some(type => 
      type.includes('soft_oversize') || type.includes('balanced') || type.includes('pack')
    );
    if (hasEnhancedTypes) {
      console.log(`  ✅ 5. Enhanced splitting: New chunk types detected`);
    }

    // Show sample improved chunk
    if (improved.chunks.length > 0) {
      const bestChunk = improved.chunks
        .filter(c => c.pageContent.length > 200)
        .sort((a, b) => {
          const aBalance = this.checkBalance(a.pageContent);
          const bBalance = this.checkBalance(b.pageContent);
          return bBalance - aBalance;
        })[0];
        
      if (bestChunk) {
        console.log(`\n🔍 SAMPLE IMPROVED CHUNK (${bestChunk.pageContent.length} chars, ${bestChunk.metadata?.splitting || 'unknown'}):`);
        console.log(`"${bestChunk.pageContent.substring(0, 200)}..."`);
      }
    }
  }

  checkBalance(text) {
    const openBraces = (text.match(/\{/g) || []).length;
    const closeBraces = (text.match(/\}/g) || []).length;
    return openBraces === closeBraces ? 1 : 0;
  }
}

// Run the test
async function main() {
  const tester = new ImprovedASTSplitterTester();
  await tester.runTest();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ImprovedASTSplitterTester;