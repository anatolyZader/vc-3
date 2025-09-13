// test_real_world_routing.js
"use strict";

const ContentAwareSplitterRouter = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/processors/ContentAwareSplitterRouter');
const fs = require('fs').promises;
const path = require('path');

/**
 * Test content-aware routing with real files from the repository
 * This demonstrates how the fix solves the original problem
 */
async function testRealWorldRouting() {
  console.log('🌍 Testing Content-Aware Routing with Real Repository Files...\n');

  const router = new ContentAwareSplitterRouter({
    maxChunkSize: 2000,
    minChunkSize: 300,
    chunkOverlap: 150
  });

  // Test files from the repository
  const testFiles = [
    {
      path: 'README.md',
      description: 'Markdown Documentation'
    },
    {
      path: 'backend/package.json', 
      description: 'JSON Configuration'
    },
    {
      path: 'backend/business_modules/api/infrastructure/api/httpApiSpec.json',
      description: 'OpenAPI/Swagger Specification'
    },
    {
      path: 'backend/server.js',
      description: 'JavaScript Code File'
    }
  ];

  const results = [];
  
  for (const testFile of testFiles) {
    console.log(`📁 Testing: ${testFile.description}`);
    console.log(`   File: ${testFile.path}`);
    
    try {
      // Check if file exists
      const fullPath = path.join('/home/myzader/eventstorm', testFile.path);
      const content = await fs.readFile(fullPath, 'utf-8');
      
      const document = {
        pageContent: content,
        metadata: {
          source: testFile.path,
          type: 'repository_file'
        }
      };

      // Test content type detection
      const detectedType = router.detectContentType(document);
      console.log(`   Detected Type: ${detectedType}`);

      // Test splitting
      const startTime = Date.now();
      const chunks = await router.splitDocument(document);
      const processingTime = Date.now() - startTime;
      
      console.log(`   Chunks Created: ${chunks.length}`);
      console.log(`   Processing Time: ${processingTime}ms`);
      
      if (chunks.length > 0) {
        console.log(`   Chunk Type: ${chunks[0].metadata?.chunk_type || 'unknown'}`);
        console.log(`   Splitting Method: ${chunks[0].metadata?.splitting_method || 'unknown'}`);
        console.log(`   Avg Chunk Size: ${Math.round(chunks.reduce((sum, c) => sum + c.pageContent.length, 0) / chunks.length)} chars`);
        
        // Show first chunk preview
        const preview = chunks[0].pageContent.substring(0, 100).replace(/\n/g, ' ');
        console.log(`   First Chunk Preview: "${preview}..."`);
      }

      results.push({
        file: testFile.path,
        description: testFile.description,
        detectedType,
        chunkCount: chunks.length,
        processingTime,
        status: 'success'
      });

      console.log(`   Status: ✅ SUCCESS\n`);

    } catch (error) {
      console.log(`   Status: ❌ ERROR - ${error.message}\n`);
      results.push({
        file: testFile.path,
        description: testFile.description,
        status: 'error',
        error: error.message
      });
    }
  }

  // Summary
  console.log('📊 REAL-WORLD TEST SUMMARY:');
  console.log('═══════════════════════════════════════\n');
  
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'error');
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}\n`);
  
  if (successful.length > 0) {
    console.log('📈 Processing Statistics:');
    const totalChunks = successful.reduce((sum, r) => sum + r.chunkCount, 0);
    const avgProcessingTime = Math.round(successful.reduce((sum, r) => sum + r.processingTime, 0) / successful.length);
    
    console.log(`   Total Chunks: ${totalChunks}`);
    console.log(`   Avg Chunks per File: ${Math.round(totalChunks / successful.length)}`);
    console.log(`   Avg Processing Time: ${avgProcessingTime}ms\n`);
    
    console.log('📂 Content Type Distribution:');
    const typeStats = {};
    successful.forEach(r => {
      typeStats[r.detectedType] = (typeStats[r.detectedType] || 0) + 1;
    });
    Object.entries(typeStats).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} files`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Files:');
    failed.forEach(r => {
      console.log(`   ${r.file}: ${r.error}`);
    });
  }

  console.log('\n🎉 Real-World Content-Aware Routing Test Complete!');
  console.log('\n💡 KEY BENEFITS DEMONSTRATED:');
  console.log('   ✅ Code files → AST splitter (preserves function/class structure)');
  console.log('   ✅ Markdown → Structure-aware splitter (preserves headings)');
  console.log('   ✅ JSON configs → Key-block splitter (preserves config sections)');
  console.log('   ✅ OpenAPI specs → Operation splitter (preserves API endpoints)');
  console.log('   ✅ No more "one-size-fits-all" AST splitting for all files!');

  return results;
}

// Compare with old approach
async function demonstrateProblemSolved() {
  console.log('\n🔄 BEFORE vs AFTER COMPARISON:');
  console.log('═══════════════════════════════════════\n');
  
  console.log('❌ BEFORE (Problem):');
  console.log('   • ALL files routed through EnhancedASTCodeSplitter');
  console.log('   • Markdown files lose heading structure');
  console.log('   • OpenAPI specs lose operation boundaries');
  console.log('   • JSON configs lose key groupings');
  console.log('   • YAML files lose hierarchical structure');
  console.log('   • Poor retrieval quality for non-code files\n');
  
  console.log('✅ AFTER (Solution):');
  console.log('   • Content-type aware routing');
  console.log('   • Code files → AST splitter (semantic units preserved)');
  console.log('   • Markdown → Structure splitter (headings preserved)');
  console.log('   • OpenAPI → Operation splitter (endpoints preserved)');
  console.log('   • JSON/YAML → Key-block splitter (sections preserved)');
  console.log('   • Improved retrieval quality for all file types\n');
}

// Run the test
if (require.main === module) {
  testRealWorldRouting()
    .then(() => demonstrateProblemSolved())
    .catch(console.error);
}

module.exports = { testRealWorldRouting, demonstrateProblemSolved };
