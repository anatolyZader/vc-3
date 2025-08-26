#!/usr/bin/env node
'use strict';

/**
 * CLI Command for Docs Documentation Generation
 * 
 * This CLI tool allows manual triggering of docs documentation generation
 * from the command line, mocking HTTP calls to the docs controller similar
 * to how pubsub listeners work.
 * 
 * Usage:
 *   node docsCli.js [options]
 * 
 * Options:
 *   --user-id <userId>  Specify a user ID (optional, defaults to 'cli-user')
 *   --help             Show help information
 */

const path = require('path');
const { performance } = require('perf_hooks');

// Load environment variables from .env files
require('dotenv').config();

// Also try to load from parent directories (common pattern)
const backendRoot = path.resolve(__dirname, '../../../../');
require('dotenv').config({ path: path.join(backendRoot, '.env') });
require('dotenv').config({ path: path.join(backendRoot, '..', '.env') }); // Project root

class DocsCLI {
  constructor() {
    this.userId = 'cli-user';
  }

  parseArguments() {
    const args = process.argv.slice(2);
    
    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '--user-id':
          if (i + 1 < args.length) {
            this.userId = args[i + 1];
            i++; // Skip next argument as it's the value
          } else {
            console.error('❌ Error: --user-id requires a value');
            process.exit(1);
          }
          break;
        case '--help':
        case '-h':
          this.showHelp();
          process.exit(0);
          break;
        default:
          console.error(`❌ Error: Unknown option ${args[i]}`);
          this.showHelp();
          process.exit(1);
      }
    }
  }

  showHelp() {
    console.log(`
📚 Docs Documentation Generator CLI

DESCRIPTION:
  Generate comprehensive documentation for all business modules and root files
  using AI-powered analysis. Architecture documentation (ARCHITECTURE.md) is
  manually maintained and will be indexed for RAG queries.
  
  This CLI mocks HTTP calls to the docs controller, similar to how pubsub
  listeners work, ensuring consistency with the web API.

USAGE:
  node docsCli.js [options]

OPTIONS:
  --user-id <userId>    Specify a user ID for the operation
                        (default: 'cli-user')
  --help, -h           Show this help message

EXAMPLES:
  # Generate documentation with default user ID
  node docsCli.js

  # Generate documentation with specific user ID
  node docsCli.js --user-id admin-123

  # Show help
  node docsCli.js --help

ENVIRONMENT VARIABLES:
  The following environment variables must be set:
  - OPENAI_API_KEY or ANTHROPIC_API_KEY (for AI provider)
  - PINECONE_API_KEY (for vector storage)

OUTPUT:
  The command will generate:
  - Module-specific documentation (e.g., ai.md, chat.md, etc.)
  - ROOT_DOCUMENTATION.md (consolidated root files documentation)
  
  Note: ARCHITECTURE.md is manually maintained and indexed for RAG queries.
`);
  }

  async validateEnvironment() {
    console.log('🔍 Validating environment...');
    
    // Show which .env files were attempted to be loaded
    const backendRoot = path.resolve(__dirname, '../../../../');
    const projectRoot = path.resolve(__dirname, '../../../../../');
    
    console.log('📁 Environment file locations checked:');
    console.log(`   • Current directory: ${process.cwd()}/.env`);
    console.log(`   • Backend root: ${backendRoot}/.env`);
    console.log(`   • Project root: ${projectRoot}/.env`);
    
    const requiredEnvVars = ['PINECONE_API_KEY'];
    const aiProviderVars = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY'];
    
    // Check required environment variables
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:');
      missingVars.forEach(varName => {
        console.error(`   - ${varName}`);
      });
      console.error('\n💡 Make sure to create a .env file with the required variables in one of these locations:');
      console.error(`   - ${backendRoot}/.env`);
      console.error(`   - ${projectRoot}/.env`);
      process.exit(1);
    }

    // Check AI provider variables (at least one must be present)
    const hasAiProvider = aiProviderVars.some(varName => process.env[varName]);
    
    if (!hasAiProvider) {
      console.error('❌ No AI provider API key found. Please set one of:');
      aiProviderVars.forEach(varName => {
        console.error(`   - ${varName}`);
      });
      console.error('\n💡 Add one of these to your .env file.');
      process.exit(1);
    }

    console.log('✅ Environment validation passed');
    
    // Log which AI provider is available
    if (process.env.OPENAI_API_KEY) {
      console.log('🤖 AI Provider: OpenAI available');
    }
    if (process.env.ANTHROPIC_API_KEY) {
      console.log('🤖 AI Provider: Anthropic available');
    }
    if (process.env.GOOGLE_API_KEY) {
      console.log('🤖 AI Provider: Google available');
    }
  }

  async runDocsUpdate() {
    console.log('\n� Starting docs documentation generation...');
    console.log(`📋 User ID: ${this.userId}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    
    const startTime = performance.now();
    
    try {
      // Create a minimal Fastify app with the required plugins for DI
      const fastify = require('fastify')({ 
        logger: { level: 'warn' } // Minimize logging for CLI usage
      });
      
      // Reggister the required plugins for DI to work
      await fastify.register(require('../../../diPlugin'));
      
      // Load the docs controller which decorates fastify with the updateDocsFiles method
      const docsController = require('../application/docsController');
      await fastify.register(docsController);
      
      // Create mock request object (same pattern as pubsub listeners)
      const mockRequest = {
        user: { id: this.userId },
        userId: this.userId, // Fallback for compatibility
        diScope: fastify.diContainer.createScope()
      };

      // Create mock reply object
      const mockReply = {
        code: (statusCode) => {
          console.log(`📡 HTTP Response Code: ${statusCode}`);
          return mockReply;
        },
        send: (response) => {
          console.log(`📡 HTTP Response: ${JSON.stringify(response)}`);
          return response;
        }
      };

      // Call the controller method directly (same pattern as pubsub listeners)
      if (typeof fastify.updateDocsFiles === 'function') {
        console.log('📡 Calling updateDocsFiles controller method...');
        const result = await fastify.updateDocsFiles(mockRequest, mockReply);
        
        const endTime = performance.now();
        const duration = Math.round((endTime - startTime) / 1000);
        
        console.log('\n🎉 Docs documentation generation completed successfully!');
        console.log(`⏱️  Total duration: ${duration} seconds`);
        console.log(`✅ Result:`, result);
        
        console.log('\n📁 Generated files:');
        console.log('   • Module documentation: [module-name].md files in each business module');
        console.log('   • Root documentation: ROOT_DOCUMENTATION.md');
        console.log('   • Architecture documentation: ARCHITECTURE.md (manually maintained)');
        
      } else {
        throw new Error('updateDocsFiles controller method not available');
      }
      
      // Clean up the fastify instance
      await fastify.close();
      
    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round((endTime - startTime) / 1000);
      
      console.error('\n❌ Docs documentation generation failed!');
      console.error(`⏱️  Duration before failure: ${duration} seconds`);
      console.error('Error:', error.message);
      
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
      
      process.exit(1);
    }
  }

  async run() {
    try {
      console.log('📚 Docs Documentation Generator CLI');
      console.log('=====================================\n');
      
      // Parse command line arguments
      this.parseArguments();
      
      // Validate environment
      await this.validateEnvironment();
      
      // Run the docs update via mock HTTP call
      await this.runDocsUpdate();
      
      console.log('\n✨ CLI execution completed successfully!');
      process.exit(0);
      
    } catch (error) {
      console.error('\n💥 CLI execution failed:');
      console.error('Error:', error.message);
      
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
      
      process.exit(1);
    }
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Process interrupted by user (Ctrl+C)');
  console.log('🔄 Cleaning up...');
  process.exit(130); // Standard exit code for SIGINT
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Process terminated');
  console.log('🔄 Cleaning up...');
  process.exit(143); // Standard exit code for SIGTERM
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n💥 Unhandled Promise Rejection at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught Exception:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});

// Run the CLI if this file is executed directly
if (require.main === module) {
  const cli = new DocsCLI();
  cli.run();
}

module.exports = DocsCLI;
