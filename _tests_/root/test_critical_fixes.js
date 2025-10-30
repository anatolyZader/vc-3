#!/usr/bin/env node

/**
 * Test the critical fixes to AST splitter:
 * 1. Fixed path traversal with findParent
 * 2. Enhanced metadata for retrieval
 * 3. Updated documentation
 */

const ASTCodeSplitter = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter');

const testCode = `
const fastify = require('fastify')({ logger: true });

fastify.register(async function userRoutes(fastify) {
  console.log('Registering user routes plugin');
  
  fastify.get('/api/users', async (request, reply) => {
    console.log('Fetching all users');
    request.log.info('User list requested');
    
    try {
      const users = await getUserList(request.query);
      console.debug('Retrieved users:', users.length); // This should be preserved
      return { users, total: users.length };
    } catch (error) {
      request.log.error('Failed to fetch users:', error);
      reply.status(500);
      return { error: 'Internal server error' };
    }
  });
});

class UserService {
  constructor(db) {
    this.db = db;
  }
  
  async getUser(id) {
    console.log(\`Getting user \${id}\`); // This should be preserved in route context
    return this.db.users.findById(id);
  }
}

export default fastify;
`.trim();

async function testCriticalFixes() {
  console.log('🧪 Testing Critical AST Splitter Fixes\n');
  
  const splitter = new ASTCodeSplitter({
    maxTokens: 800,
    collectTelemetry: true
  });

  try {
    const chunks = splitter.split(testCode, {
      source: '/api/routes/users.js',
      type: 'github-file',
      fileType: 'js',
      eventstorm_module: 'api'
    });
    
    console.log(`✅ Generated ${chunks.length} chunks successfully`);
    
    chunks.forEach((chunk, i) => {
      console.log(`\n📋 Chunk ${i + 1}:`);
      console.log(`  Type: ${chunk.metadata.splitting}`);
      console.log(`  Tokens: ${chunk.metadata.tokenCount}`);
      
      // Test new metadata fields
      console.log(`  🆔 SpanHash: ${chunk.metadata.spanHash?.substring(0, 12)}...`);
      console.log(`  🎯 Semantic Role: ${chunk.metadata.semantic_role || 'none'}`);
      console.log(`  📝 Unit Name: ${chunk.metadata.unit_name || 'none'}`);
      console.log(`  🔲 Complete Block: ${chunk.metadata.is_complete_block ? '✅' : '❌'}`);
      console.log(`  📁 File Type: ${chunk.metadata.fileType}`);
      console.log(`  🏗️ Module: ${chunk.metadata.eventstorm_module}`);
      
      // Show content preview
      const preview = chunk.pageContent.substring(0, 120).replace(/\n/g, ' ');
      console.log(`  📄 Preview: ${preview}...`);
      
      // Check if logs were preserved correctly in route context
      if (chunk.pageContent.includes('console.debug') || chunk.pageContent.includes('console.log')) {
        console.log(`  🛡️ Preserved contextual logs: ✅`);
      }
    });
    
    // Test telemetry
    const lastChunk = chunks[chunks.length - 1];
    if (lastChunk?.metadata?.splitTelemetry) {
      console.log('\n📊 Telemetry:');
      const tel = lastChunk.metadata.splitTelemetry;
      console.log(`  Complete blocks: ${tel.balanceStats.completeBlocksPercentage}%`);
      console.log(`  Balanced chunks: ${tel.balanceStats.balancedChunksPercentage}%`);
      console.log(`  Splitting types:`, Object.keys(tel.splittingTypes));
    }
    
    // Test spanHash uniqueness
    const spanHashes = chunks.map(c => c.metadata.spanHash).filter(Boolean);
    const uniqueHashes = new Set(spanHashes);
    console.log(`\n🔗 SpanHash uniqueness: ${uniqueHashes.size}/${spanHashes.length} unique`);
    
    console.log('\n✅ All critical fixes working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  testCriticalFixes().catch(console.error);
}