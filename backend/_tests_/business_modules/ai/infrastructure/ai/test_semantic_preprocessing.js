// test_semantic_preprocessing.js
"use strict";

const SemanticPreprocessor = require('/home/myzader/vibeswitch/backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/enhancers/semanticPreprocessor');

async function testSemanticPreprocessing() {
  console.log('🧪 Testing Semantic Preprocessing...\n');

  const preprocessor = new SemanticPreprocessor();

  // Test different types of code chunks
  const testChunks = [
    {
      pageContent: `
class UserController {
  async getUser(request, reply) {
    const userId = request.params.id;
    const user = await this.userService.findById(userId);
    reply.send(user);
  }
}`,
      metadata: {
        source: 'backend/controllers/UserController.js',
        userId: 'test-user',
        repoId: 'test-repo'
      }
    },
    {
      pageContent: `
class User extends Entity {
  constructor(id, name, email) {
    super(id);
    this.name = name;
    this.email = email;
  }
  
  updateEmail(newEmail) {
    this.email = newEmail;
    this.emit('EmailUpdated', { userId: this.id, newEmail });
  }
}`,
      metadata: {
        source: 'backend/business_modules/user/domain/entities/User.js',
        userId: 'test-user',
        repoId: 'test-repo'
      }
    },
    {
      pageContent: `
const fastify = require('fastify')({ logger: true });

// Register plugins
fastify.register(require('./plugins/corsPlugin'));
fastify.register(require('./plugins/authPlugin'));

// Start server
const start = async () => {
  await fastify.listen(3000);
  console.log('Server started on port 3000');
};

start();`,
      metadata: {
        source: 'backend/server.js',
        userId: 'test-user',
        repoId: 'test-repo'
      }
    },
    {
      pageContent: `
describe('UserService', () => {
  it('should create a new user', async () => {
    const userService = new UserService();
    const userData = { name: 'John', email: 'john@test.com' };
    
    const user = await userService.create(userData);
    
    expect(user.name).toBe('John');
    expect(user.email).toBe('john@test.com');
  });
});`,
      metadata: {
        source: 'backend/__tests__/UserService.test.js',
        userId: 'test-user',
        repoId: 'test-repo'
      }
    }
  ];

  for (let i = 0; i < testChunks.length; i++) {
    const chunk = testChunks[i];
    console.log(`\n📄 Test ${i + 1}: ${chunk.metadata.source}`);
    console.log('─'.repeat(50));
    
    try {
      const enhancedChunk = await preprocessor.preprocessChunk(chunk);
      
      console.log('🧠 Enhanced Metadata:');
      console.log(`  • Semantic Role: ${enhancedChunk.metadata.semantic_role}`);
      console.log(`  • Architectural Layer: ${enhancedChunk.metadata.layer}`);
      console.log(`  • VibeSwitch Module: ${enhancedChunk.metadata.vibeswitch_module}`);
      console.log(`  • Is Entry Point: ${enhancedChunk.metadata.is_entrypoint}`);
      console.log(`  • Complexity: ${enhancedChunk.metadata.complexity}`);
      console.log(`  • Enhanced: ${enhancedChunk.metadata.enhanced}`);
      
      console.log('\n📝 Enhanced Content Preview:');
      const preview = enhancedChunk.pageContent.split('\n').slice(0, 10).join('\n');
      console.log(preview);
      console.log('...');
      
    } catch (error) {
      console.error(`❌ Error processing chunk: ${error.message}`);
    }
  }

  console.log('\n✅ Semantic preprocessing test completed!');
}

// Run test if this file is executed directly
if (require.main === module) {
  testSemanticPreprocessing().catch(console.error);
}

module.exports = testSemanticPreprocessing;
