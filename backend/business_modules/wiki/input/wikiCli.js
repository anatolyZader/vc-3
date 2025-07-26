#!/usr/bin/env node
'use strict';

/**
 * CLI Command for Wiki Documentation Generation
 * 
 * This CLI tool allows manual triggering of wiki documentation generation
 * from the command line, using the same WikiLangchainAdapter that the
 * web API uses.
 * 
 * Usage:
 *   node wikiCli.js [options]
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

// Import the WikiLangchainAdapter
const WikiLangchainAdapter = require('../infrastructure/ai/wikiLangchainAdapter');

class WikiCLI {
  constructor() {
    this.wikiAdapter = null;
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
📚 Wiki Documentation Generator CLI

DESCRIPTION:
  Generate comprehensive documentation for all business modules, root files,
  and overall application architecture using AI-powered analysis.

USAGE:
  node wikiCli.js [options]

OPTIONS:
  --user-id <userId>    Specify a user ID for the operation
                        (default: 'cli-user')
  --help, -h           Show this help message

EXAMPLES:
  # Generate documentation with default user ID
  node wikiCli.js

  # Generate documentation with specific user ID
  node wikiCli.js --user-id admin-123

  # Show help
  node wikiCli.js --help

ENVIRONMENT VARIABLES:
  The following environment variables must be set:
  - OPENAI_API_KEY or ANTHROPIC_API_KEY (for AI provider)
  - PINECONE_API_KEY (for vector storage)

OUTPUT:
  The command will generate:
  - Module-specific documentation (e.g., ai.md, chat.md, etc.)
  - ROOT_DOCUMENTATION.md (consolidated root files documentation)
  - ARCHITECTURE.md (overall application architecture)
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

  async initializeWikiAdapter() {
    console.log('🔧 Initializing WikiLangchainAdapter...');
    
    try {
      // Determine AI provider based on available environment variables
      let aiProvider = 'openai'; // default
      if (process.env.ANTHROPIC_API_KEY) {
        aiProvider = 'anthropic';
      } else if (process.env.GOOGLE_API_KEY) {
        aiProvider = 'google';
      }

      this.wikiAdapter = new WikiLangchainAdapter({ aiProvider });
      console.log(`✅ WikiLangchainAdapter initialized with provider: ${aiProvider}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize WikiLangchainAdapter:', error.message);
      console.error('Error details:', error.stack);
      process.exit(1);
    }
  }

  async runWikiUpdate() {
    console.log('\n🚀 Starting wiki documentation generation...');
    console.log(`📋 User ID: ${this.userId}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    
    const startTime = performance.now();
    
    try {
      const result = await this.wikiAdapter.updateWikiFiles(this.userId);
      
      const endTime = performance.now();
      const duration = Math.round((endTime - startTime) / 1000);
      
      console.log('\n🎉 Wiki documentation generation completed successfully!');
      console.log(`⏱️  Total duration: ${duration} seconds`);
      console.log(`✅ Result:`, result);
      
      console.log('\n📁 Generated files:');
      console.log('   • Module documentation: [module-name].md files in each business module');
      console.log('   • Root documentation: ROOT_DOCUMENTATION.md');
      console.log('   • Architecture documentation: ARCHITECTURE.md');
      
    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round((endTime - startTime) / 1000);
      
      console.error('\n❌ Wiki documentation generation failed!');
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
      console.log('📚 Wiki Documentation Generator CLI');
      console.log('=====================================\n');
      
      // Parse command line arguments
      this.parseArguments();
      
      // Validate environment
      await this.validateEnvironment();
      
      // Initialize the wiki adapter
      await this.initializeWikiAdapter();
      
      // Run the wiki update
      await this.runWikiUpdate();
      
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
  const cli = new WikiCLI();
  cli.run();
}

module.exports = WikiCLI;
