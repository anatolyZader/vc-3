#!/usr/bin/env node

/**
 * Test the improved AST splitter to verify it produces better semantic chunks
 * Compares original vs improved AST splitting quality
 */

const { createSemanticASTSplitter } = require('./improved_ast_splitter');
const ASTCodeSplitter = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter');
const fs = require('fs');
const path = require('path');

class ASTSplitterComparison {
  constructor() {
    // Original splitter (current configuration)
    this.originalSplitter = new ASTCodeSplitter({
      maxTokens: 800,
      minTokens: 60,
      overlapTokens: 80,
      maxUnitsPerChunk: 1,
      charsPerToken: 4,
      minResidualChars: 12
    });

    // Improved splitter
    this.improvedSplitter = createSemanticASTSplitter({
      maxTokens: 1200,
      minTokens: 150,
      overlapTokens: 100,
      maxUnitsPerChunk: 3,
      charsPerToken: 4,
      minResidualChars: 50
    });

    this.testFiles = [
      './business_modules/ai/application/aiController.js',
      './business_modules/ai/infrastructure/ai/aiService.js',
      './business_modules/auth/application/authController.js',
      './app.js'
    ];
  }

  async runComparison() {
    console.log(`\n${'='.repeat(100)}`);
    console.log(`🧬 AST SPLITTER QUALITY COMPARISON`);
    console.log(`${'='.repeat(100)}`);

    const results = {
      original: { chunks: [], totalFiles: 0, avgQuality: 0 },
      improved: { chunks: [], totalFiles: 0, avgQuality: 0 }
    };

    for (const filePath of this.testFiles) {
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Skipping ${filePath} - file not found`);
        continue;
      }

      console.log(`\n${'-'.repeat(80)}`);
      console.log(`📁 Testing file: ${filePath}`);
      console.log(`${'-'.repeat(80)}`);

      const sourceCode = fs.readFileSync(filePath, 'utf-8');
      console.log(`File size: ${sourceCode.length} characters`);

      // Test original splitter
      const originalChunks = await this.testSplitter('ORIGINAL', this.originalSplitter, sourceCode, filePath);
      results.original.chunks.push(...originalChunks);
      results.original.totalFiles++;

      // Test improved splitter
      const improvedChunks = await this.testSplitter('IMPROVED', this.improvedSplitter, sourceCode, filePath);
      results.improved.chunks.push(...improvedChunks);
      results.improved.totalFiles++;

      // Compare side by side
      this.compareChunks(originalChunks, improvedChunks, filePath);
    }

    // Overall comparison
    this.generateOverallComparison(results);
  }

  async testSplitter(name, splitter, sourceCode, filePath) {
    try {
      console.log(`\n🔧 ${name} SPLITTER:`);
      
      const startTime = Date.now();
      const chunks = splitter.split(sourceCode, { source: filePath });
      const duration = Date.now() - startTime;

      console.log(`  ✅ Generated ${chunks.length} chunks in ${duration}ms`);
      
      // Analyze quality
      const quality = this.analyzeChunkQuality(chunks);
      console.log(`  📊 Quality metrics:`);
      console.log(`    - Average size: ${quality.avgSize} chars`);
      console.log(`    - Complete structures: ${quality.completeStructures}/${chunks.length} (${Math.round(quality.completeStructures/chunks.length*100)}%)`);
      console.log(`    - Semantic coherence: ${quality.semanticCoherence.toFixed(2)}/5.0`);
      console.log(`    - Balanced braces: ${quality.balancedBraces}/${chunks.length} (${Math.round(quality.balancedBraces/chunks.length*100)}%)`);

      return chunks.map(chunk => ({ ...chunk, _quality: quality, _splitter: name }));
    } catch (error) {
      console.error(`  ❌ ${name} splitter failed:`, error.message);
      return [];
    }
  }

  analyzeChunkQuality(chunks) {
    if (chunks.length === 0) {
      return { avgSize: 0, completeStructures: 0, semanticCoherence: 0, balancedBraces: 0 };
    }

    let totalSize = 0;
    let completeStructures = 0;
    let balancedBraces = 0;
    let semanticScoreSum = 0;

    chunks.forEach(chunk => {
      const content = chunk.pageContent || '';
      totalSize += content.length;

      // Check structural completeness
      const openBraces = (content.match(/\{/g) || []).length;
      const closeBraces = (content.match(/\}/g) || []).length;
      
      if (openBraces === closeBraces && openBraces > 0) {
        balancedBraces++;
      }

      // Check for complete functions/classes
      const hasFunctionDef = /\b(function\s+\w+|class\s+\w+|const\s+\w+\s*=\s*\()/g.test(content);
      const hasMethodBody = openBraces > 0 && closeBraces > 0;
      
      if (hasFunctionDef && hasMethodBody && openBraces === closeBraces) {
        completeStructures++;
      }

      // Semantic coherence score (1-5)
      let semanticScore = 1;
      
      // Bonus for meaningful content
      const meaningfulLines = content.split('\n').filter(line => 
        line.trim() && 
        !line.trim().startsWith('//') && 
        line.trim().length > 5
      ).length;
      
      if (meaningfulLines > 5) semanticScore += 1;
      if (meaningfulLines > 10) semanticScore += 1;
      
      // Bonus for structural integrity
      if (openBraces === closeBraces) semanticScore += 1;
      
      // Bonus for semantic units
      if (/\b(function|class|module\.exports|require\()/g.test(content)) {
        semanticScore += 1;
      }
      
      semanticScoreSum += Math.min(semanticScore, 5);
    });

    return {
      avgSize: Math.round(totalSize / chunks.length),
      completeStructures,
      balancedBraces,
      semanticCoherence: semanticScoreSum / chunks.length
    };
  }

  compareChunks(originalChunks, improvedChunks, filePath) {
    console.log(`\n📊 SIDE-BY-SIDE COMPARISON for ${path.basename(filePath)}:`);
    console.log(`${'Metric'.padEnd(30)} | ${'Original'.padEnd(15)} | ${'Improved'.padEnd(15)} | ${'Change'.padEnd(15)}`);
    console.log(`${'-'.repeat(80)}`);
    
    const origQuality = this.analyzeChunkQuality(originalChunks);
    const impQuality = this.analyzeChunkQuality(improvedChunks);
    
    console.log(`${'Chunk Count'.padEnd(30)} | ${originalChunks.length.toString().padEnd(15)} | ${improvedChunks.length.toString().padEnd(15)} | ${this.formatChange(improvedChunks.length - originalChunks.length)}`);
    console.log(`${'Avg Size (chars)'.padEnd(30)} | ${origQuality.avgSize.toString().padEnd(15)} | ${impQuality.avgSize.toString().padEnd(15)} | ${this.formatChange(impQuality.avgSize - origQuality.avgSize)}`);
    console.log(`${'Complete Structures'.padEnd(30)} | ${origQuality.completeStructures.toString().padEnd(15)} | ${impQuality.completeStructures.toString().padEnd(15)} | ${this.formatChange(impQuality.completeStructures - origQuality.completeStructures)}`);
    console.log(`${'Balanced Braces'.padEnd(30)} | ${origQuality.balancedBraces.toString().padEnd(15)} | ${impQuality.balancedBraces.toString().padEnd(15)} | ${this.formatChange(impQuality.balancedBraces - origQuality.balancedBraces)}`);
    console.log(`${'Semantic Score'.padEnd(30)} | ${origQuality.semanticCoherence.toFixed(2).padEnd(15)} | ${impQuality.semanticCoherence.toFixed(2).padEnd(15)} | ${this.formatChange(impQuality.semanticCoherence - origQuality.semanticCoherence, true)}`);

    // Show sample chunks
    if (originalChunks.length > 0 && improvedChunks.length > 0) {
      console.log(`\n🔍 SAMPLE CHUNK COMPARISON:`);
      console.log(`Original chunk preview (first 200 chars):`);
      console.log(`"${(originalChunks[0].pageContent || '').substring(0, 200)}..."`);
      console.log(`Improved chunk preview (first 200 chars):`);
      console.log(`"${(improvedChunks[0].pageContent || '').substring(0, 200)}..."`);
    }
  }

  formatChange(change, isFloat = false) {
    if (change === 0) return '0'.padEnd(15);
    
    const formatted = isFloat ? change.toFixed(2) : change.toString();
    const symbol = change > 0 ? '+' : '';
    const color = change > 0 ? '↗️' : change < 0 ? '↘️' : '→';
    
    return `${symbol}${formatted} ${color}`.padEnd(15);
  }

  generateOverallComparison(results) {
    console.log(`\n${'='.repeat(100)}`);
    console.log(`📈 OVERALL QUALITY COMPARISON RESULTS`);
    console.log(`${'='.repeat(100)}`);

    const origOverall = this.analyzeChunkQuality(results.original.chunks);
    const impOverall = this.analyzeChunkQuality(results.improved.chunks);

    console.log(`\n📊 AGGREGATE METRICS ACROSS ALL FILES:`);
    console.log(`- Files processed: ${results.original.totalFiles}`);
    console.log(`- Total chunks (original): ${results.original.chunks.length}`);
    console.log(`- Total chunks (improved): ${results.improved.chunks.length}`);

    console.log(`\n🎯 QUALITY IMPROVEMENTS:`);
    
    const structuralImprovement = ((impOverall.completeStructures / results.improved.chunks.length) - 
                                  (origOverall.completeStructures / results.original.chunks.length)) * 100;
    
    const semanticImprovement = impOverall.semanticCoherence - origOverall.semanticCoherence;
    
    const braceImprovement = ((impOverall.balancedBraces / results.improved.chunks.length) - 
                             (origOverall.balancedBraces / results.original.chunks.length)) * 100;

    console.log(`✅ Structural completeness: ${structuralImprovement >= 0 ? '+' : ''}${structuralImprovement.toFixed(1)}% ${structuralImprovement > 0 ? '(BETTER)' : '(WORSE)'}`);
    console.log(`✅ Semantic coherence: ${semanticImprovement >= 0 ? '+' : ''}${semanticImprovement.toFixed(2)} points ${semanticImprovement > 0 ? '(BETTER)' : '(WORSE)'}`);
    console.log(`✅ Balanced braces: ${braceImprovement >= 0 ? '+' : ''}${braceImprovement.toFixed(1)}% ${braceImprovement > 0 ? '(BETTER)' : '(WORSE)'}`);

    console.log(`\n🏆 RECOMMENDATION:`);
    if (structuralImprovement > 10 && semanticImprovement > 0.5) {
      console.log(`🚀 STRONGLY RECOMMENDED: Switch to improved AST splitter`);
      console.log(`   - Significantly better structural completeness`);
      console.log(`   - Improved semantic coherence`);
      console.log(`   - Should result in better RAG performance`);
    } else if (structuralImprovement > 0 && semanticImprovement > 0) {
      console.log(`✅ RECOMMENDED: Consider switching to improved AST splitter`);
      console.log(`   - Moderate improvements in chunk quality`);
    } else {
      console.log(`⚠️ NEEDS TUNING: Improved splitter shows mixed results`);
      console.log(`   - May need further configuration adjustments`);
    }

    // Show content type distribution if available
    const improvedWithTypes = results.improved.chunks.filter(c => c.metadata?.semanticType);
    if (improvedWithTypes.length > 0) {
      console.log(`\n🏷️ SEMANTIC TYPE DISTRIBUTION (Improved Splitter):`);
      const typeDistribution = {};
      improvedWithTypes.forEach(chunk => {
        const type = chunk.metadata.semanticType;
        typeDistribution[type] = (typeDistribution[type] || 0) + 1;
      });
      
      Object.entries(typeDistribution)
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
          console.log(`  - ${type}: ${count} chunks`);
        });
    }
  }
}

// Main execution
async function main() {
  console.log(`[${new Date().toISOString()}] 🧬 AST Splitter Quality Comparison Tool`);
  console.log(`[${new Date().toISOString()}] 📋 Testing original vs improved AST splitting`);
  
  const comparison = new ASTSplitterComparison();
  await comparison.runComparison();
}

// Run the comparison
if (require.main === module) {
  main().catch(error => {
    console.error(`[${new Date().toISOString()}] ❌ Comparison failed:`, error);
    process.exit(1);
  });
}

module.exports = ASTSplitterComparison;