---
**ARCHIVED TRACE ANALYSIS**
- Archived on: 2025-11-03T17:01:26.970Z
- Triggered by query: "list all methods in aiLangchainAdapter.js"
- Original file: latest-trace-analysis.md
---

# LangSmith RAG Trace Analysis - 11/3/2025, 4:12:08 PM

## 🔍 Query Details
- **Query**: "list all methods in aiService.js"
- **User ID**: d41402df-182a-41ec-8f05-153118bf2718
- **Conversation ID**: db81afed-da95-47a6-879f-fc0648fa651c
- **Started**: 2025-11-03T16:12:08.811Z
- **Completed**: 2025-11-03T16:12:15.152Z
- **Total Duration**: 6341ms

## 🔗 LangSmith Trace Information
- **Project**: eventstorm-trace
- **Tracing Enabled**: ✅ Yes
- **Trace ID**: ❌ Error: getCurrentRunTree is not a function
- **Run ID**: ⚠️  Not captured

- **Environment**: development




❌ **Tracing Error**: getCurrentRunTree is not a function
   - LangSmith tracing is enabled but failed to capture trace metadata
   - Check LANGCHAIN_API_KEY and LANGCHAIN_PROJECT settings
   - Verify langsmith package is installed correctly


### Pipeline Execution Steps:
1. **initialization** (2025-11-03T16:12:08.811Z) - success
2. **vector_store_check** (2025-11-03T16:12:08.811Z) - success
3. **vector_search** (2025-11-03T16:12:11.963Z) - success - Found 29 documents
4. **text_search** (2025-11-03T16:12:11.967Z) - success
5. **hybrid_search_combination** (2025-11-03T16:12:11.967Z) - success
6. **context_building** (2025-11-03T16:12:11.968Z) - success - Context: 38808 chars
7. **response_generation** (2025-11-03T16:12:15.152Z) - success - Response: 822 chars

## 📊 Vector Search Analysis

### Search Configuration:
- **Vector Store**: primary
- **Search Strategy**: intelligent_strategy_with_filters
- **Documents Retrieved**: 29
- **Raw Content Size**: 193,537 characters (original chunks)
- **Formatted Context Size**: 38,808 characters (sent to LLM)
- **Compression Ratio**: 20% (due to truncation + formatting overhead)

### Source Type Distribution:
- **GitHub Repository Code**: 29 chunks (100%)
- **Module Documentation**: 0 chunks (0%)  
- **Architecture Documentation**: 0 chunks (0%)
- **API Specification**: 0 chunks (0%)
- **Other Sources**: 0 chunks (0%)

## 🏷️ Ubiquitous Language (UL) Tags Analysis

### UL Tag Coverage:
- **Chunks with UL Tags**: 0/29 (0%)
- **Chunks without UL Tags**: 29/29 (100%)
- **Coverage Status**: ❌ Poor - Repository may need re-indexing

### Domain Coverage:
- **Bounded Contexts**: 0 unique contexts
  
- **Business Modules**: 0 unique modules
  
- **Total UL Terms**: 0 terms found across all chunks
- **Unique Terms**: 0 distinct terms
  
- **Domain Events**: 0 unique events
  

### ⚠️ Missing UL Tags Warning:
29 chunks (100%) are missing ubiquitous language tags. This may indicate:
- Files indexed before UL enhancement was implemented (check `processedAt` timestamps)
- Non-code files (markdown analysis files, configs) that bypass UL processing
- Repository needs re-indexing to apply current UL enhancement pipeline
- Error during UL enhancement (check logs for warnings)

**Recommendation**: 🔴 **CRITICAL**: Re-index repository to apply UL tags to all chunks



## 📋 Complete Chunk Analysis


### Chunk 1/29
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 6338 characters
- **Score**: 0.361166
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
! this file is to be updated manually only !

Eventstorm.me Architecture

(In this document, file names are taken from the ai module for exemplary purposes.)

General Overview

Eventstorm.me is a full-stack React – Fastify application.

Client Side

to be added…

Backend Side

Modular Monolith

Eventstorm.me backend is a modular monolith with two kinds of modules:

AOP modules – for cross-cutting concerns

Business modules – for main business concerns, 
Each business module represents a bounded context in Domain-Driven Design.

The Business modules represent the core business capabilities with strict boundaries and event-driven communication, while AOP modules provide shared technical services that cross module boundaries. This creates a clean separation between business concerns (what the system does) and technical concerns (how the system works), following both Domain-Driven Design and Aspect-Oriented Programming principles. 

This architecture allows Eventstorm.me to maintain a modular monolith that could potentially be split into microservices by extracting business modules while keeping AOP concerns as shared libraries or infrastructure services.

Difference in communication:

Business → Business: async only via Pub/Sub (domain or integration events). No direct calls. Contracts = event schemas.

Business → AOP: direct method calls (e.g., permissions.check(), auth.verify(), log.info()) through well-defined interfaces.

AOP → Business: never call back into business logic (prevents cycles). AOP modules are dependency sinks.

AOP modules are globally accessible via Fastify decorators

DDD + Hexagonal Architecture:

Each module (AOP or business) is built according to DDD and Hexagonal (Ports and Adapters) multilayered architecture, with a rich domain layer and strict isolation between layers.

Layers in Each Module:
1. Input

Incoming requests are accepted here.

The Input folder in the module directory usually includes:

aiRouter.js

HTTP route endpoints

Fastify schema for each endpoint

Pre-validation of request

Handler set (Fastify decorator function)

This function is defined in the controller file from the same module

aiPubsubListener.js

Listener for a given pubsub topic

Messages are received

Payload is extracted and transferred to the controller file method as a mocked Request object (to behave like an HTTP request)

Example:

subscription.on('message', async (message) => {
  fastify.log.info(`Received docs message ${message.id} on subscription ${subscriptionName}`);

  try {
    const data = JSON.parse(message.data.toString());

    if (data.event === 'fetchDocsRequest') {
      const { userId, repoId, correlationId } = data.payload;

      const mockRequest = {
        params: { repoId },
        user: { id: userId },
        userId
      };
      const mockReply = {};

      await fastify.fetchDocs(mockRequest, mockReply);
    }
  } catch (err) {
    fastify.log.error(err);
  }
});

2. Controller

Each module includes a thin controller.

Purpose: accept a request object (or its mock), extract required data, call the module’s service file (aiService.js).

Each controller method is set up as a Fastify decorator.

Accessible to the module-specific child Fastify instance (isolated from the root instance by Fastify encapsulation).

3. Service

Contains the main business logic of the app.

Calls methods of domain entities/aggregates.

Replaces domain ports with specific adapters (ports and adapters / hexagonal).

Deals with persistence, messaging, etc.

Note: Controller + Service = Application Layer.

4. Domain

The domain layer includes a rich model with DDD tactical patterns:

Aggregates

Entities

Ports (persistence, messaging, AI, etc.)

Value objects

Domain events

The DDD ubiquitous language dictionary has been split into focused catalogs:
- `ubiq-language.json` - Pure business terminology and domain concepts
- `arch-catalog.json` - Architectural patterns, layers, and design principles  
- `infra-catalog.json` - Infrastructure configuration and technical dependencies
- `workflows.json` - High-level business processes and integration patterns

5. Infrastructure

The infrastructure layer includes specific adapters implementing ports from the domain layer to interact with external systems.

More than one adapter can exist for a port.

Example: aiPostgresAdapter.js and aiMySQLAdapter.js both implement IAIPersistPort.js.

Active adapter set in infraConfig.json.

Example:

{
  "aop_modules": {
    "auth": {
      "authPersistAdapter": "authPostgresAdapter"
    }
  },
  "business_modules": {
    "chat": {
      "chatPersistAdapter": "chatPostgresAdapter",
      "chatAiAdapter": "chatAiAdapter",
      "chatMessagingAdapter": "chatPubsubAdapter",
      "chatVoiceAdapter": "chatGCPVoiceAdapter"
    },
    "git": {
      "gitAdapter": "gitGithubAdapter",
      "gitMessagingAdapter": "gitPubsubAdapter",
      "gitPersistAdapter": "gitPostgresAdapter"
    },
    "docs": {
      "docsMessagingAdapter": "docsPubsubAdapter",
      "docsPersistAdapter": "docsPostgresAdapter",
      "docsAiAdapter": "docsLangchainAdapter",
      "docsGitAdapter": "docsGithubAdapter"
    },
    "ai": {
      "aiPersistAdapter": "aiPostgresAdapter",
      "aiAdapter": "aiLangchainAdapter",
      "aiProvider": "anthropic",
      "aiMessagingAdapter": "aiPubsubAdapter",
      "aiGitAdapter": "aiGithubAdapter",
      "aiDocsAdapter": "aiGithubDocsAdapter"
    },
    "messaging": {
      "messagingPersistAdapter": "messagingPostgresAdapter",
      "messagingAIAdapter": "messagingLangchainAdapter",
      "messagingMessagingAdapter": "messagingPubsubAdapter"
    },
    "api": {
      "apiPersistAdapter": "apiPostgresAdapter",
      "apiMessagingAdapter": "apiPubsubAdapter",
      "apiAdapter": "apiSwaggerAdapter"
    }
  }
}

Important Notes:

- Fastify code is limited to Input and Application layers.

- Domain and Infrastructure layers are isolated from Fastify, built on regular JS files (not Fastify plugins).

Additional Topics:

Dependency Injection

- Used in each module

- Keeps data flow inside-out (domain → adapters)

- Implements hexagonal design effectively

Environmental Variables

- Set in .env file at root app directory

Backend For Frontend (BFF)

- Implemented partially

- Example: Chat module (handles user interaction via Chat UI)
```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-docs",
  "ubiq_enhanced": false,
  "score": 0.361166,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:9ebe3528d2dd55c2"
}
```

---

### Chunk 2/29
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 5324 characters
- **Score**: 0.314914703
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');

module.exports = fp(async function docsRouter(fastify, opts) {
  console.log('docsRouter is loaded!');

  // Route to fetch a whole docs
  fastify.route({
    method: 'GET',
    url: '/repos/:repoId/docs',
    preValidation: [fastify.verifyToken],
    handler: fastify.fetchDocs,
    schema: {
      tags: ['docs'],
      params: {
        type: 'object',
        properties: {
          repoId: { type: 'string', minLength: 1 }
        },
        required: ['repoId'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            repoId: { type: 'string' },
            pages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  pageId: { type: 'string' },
                  title: { type: 'string' },
                  updatedAt: { type: 'string', format: 'date-time' }
                },
                required: ['pageId', 'title', 'updatedAt'],
                additionalProperties: true
              }
            }
          },
          required: ['repoId', 'pages'],
          additionalProperties: true
        }
      }
    }
  });

  // Route to create a new docs page
  fastify.route({
    method: 'POST',
    url: '/repos/:repoId/pages/create',
    preValidation: [fastify.verifyToken],
    handler: fastify.createPage,
    schema: {
      tags: ['docs'],
      params: {
        type: 'object',
        properties: {
          repoId: { type: 'string', minLength: 1 }
        },
        required: ['repoId'],
        additionalProperties: false
      },
      body: {
        type: 'object',
        properties: {
          pageTitle: { type: 'string', minLength: 1 }
        },
        required: ['pageTitle'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          },
          required: ['message'],
          additionalProperties: false
        }
      }
    }
  });

  // Route to fetch a specific docs page
  fastify.route({
    method: 'GET',
    url: '/repos/:repoId/pages/:pageId',
    preValidation: [fastify.verifyToken],
    handler: fastify.fetchPage,
    schema: {
      tags: ['docs'],
      params: {
        type: 'object',
        properties: {
          repoId: { type: 'string', minLength: 1 },
          pageId: { type: 'string', minLength: 1 }
        },
        required: ['repoId', 'pageId'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            pageId: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['pageId', 'title', 'content', 'updatedAt'],
          additionalProperties: false
        }
      }
    }
  });

  // Route to update docs page content
  fastify.route({
    method: 'PUT',
    url: '/repos/:repoId/pages/:pageId',
    preValidation: [fastify.verifyToken],
    handler: fastify.updatePage,
    schema: {
      tags: ['docs'],
      params: {
        type: 'object',
        properties: {
          repoId: { type: 'string', minLength: 1 },
          pageId: { type: 'string', minLength: 1 }
        },
        required: ['repoId', 'pageId'],
        additionalProperties: false
      },
      body: {
        type: 'object',
        properties: {
          newContent: { type: 'string', minLength: 1 }
        },
        required: ['newContent'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          },
          required: ['message'],
          additionalProperties: false
        }
      }
    }
  });

  // Route to delete a docs page
  fastify.route({
    method: 'DELETE',
    url: '/repos/:repoId/pages/:pageId',
    preValidation: [fastify.verifyToken],
    handler: fastify.deletePage,
    schema: {
      tags: ['docs'],
      params: {
        type: 'object',
        properties: {
          repoId: { type: 'string', minLength: 1 },
          pageId: { type: 'string', minLength: 1 }
        },
        required: ['repoId', 'pageId'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          },
          required: ['message'],
          additionalProperties: false
        }
      }
    }
  });

  // Route to trigger docs files update
  fastify.route({
    method: 'POST',
    url: '/update-files',
    preValidation: [fastify.verifyToken],
    handler: fastify.updateDocsFiles,
    schema: {
      tags: ['docs'],
      description: 'Triggers an AI-based process to analyze all business modules and generate/update markdown documentation files for each.',
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          },
          required: ['message'],
          additionalProperties: false
        }
      }
    }
  });
});
```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-docs",
  "ubiq_enhanced": false,
  "score": 0.314914703,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:7498c4d3da949337"
}
```

---

### Chunk 3/29
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 9745 characters
- **Score**: 0.313402176
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
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

```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-docs",
  "ubiq_enhanced": false,
  "score": 0.313402176,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:837b8a6d03d2443b"
}
```

---

### Chunk 4/29
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 1000 characters
- **Score**: 0.275909424
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
// docsPubsubAdapter.js
'use strict';

const IDocsMessagingPort = require('../../../domain/ports/IDocsMessagingPort');

class DocsPubsubAdapter extends IDocsMessagingPort {
  constructor({ pubSubClient }) {
    super();
    this.pubSubClient = pubSubClient;
    this.topicName = 'docs';
  }

  async publishfetchedDocsEvent(fetchedDocs) {
    const event = {
    event: 'docsFetched',
    payload: { ...fetchedDocs }
    };

    const dataBuffer = Buffer.from(JSON.stringify(event));
    try {
      const [topic] = await this.pubSubClient
        .topic(this.topicName)
        .get({ autoCreate: true });
      const messageId = await topic.publishMessage({ data: dataBuffer });
      console.log(`Published 'docsFetched' event with message ID: ${messageId} to topic: ${this.topicName}`);
      return messageId;
    } catch (error) {
      console.error(`Error publishing 'docsFetched' event to topic ${this.topicName}:`, error);
      throw error;
    }
  }
}

module.exports = DocsPubsubAdapter;
```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-docs",
  "ubiq_enhanced": false,
  "score": 0.275909424,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:f5f6a9819e3adf32"
}
```

---

### Chunk 5/29
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 1771 characters
- **Score**: 0.272293091
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
/* eslint-disable no-unused-vars */
// docsSchemasPlugin.js

'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function docsSchemasPlugin(fastify, opts) {
  console.log('docsSchemasPlugin loaded!');

  const schemas = [
    { id: 'schema:docs:fetch-docs', path: '../input/schemas/fetchDocsSchema.js' },
    { id: 'schema:docs:delete-page', path: '../input/schemas/deletePageSchema.js' },
    { id: 'schema:docs:fetch-page', path: '../input/schemas/fetchPageSchema.js' },
    { id: 'schema:docs:update-page', path: '../input/schemas/updatePageSchema.js' },
    { id: 'schema:docs:create-page', path: '../input/schemas/createPageSchema.js' }
  ];

  schemas.forEach(({ id, path }) => {
    if (!fastify.getSchema(id)) {
      try {
        const schema = require(path);
        
        // Debug to help identify the issue
        if (schema.$id !== id) {
          fastify.log.warn(`Schema ID mismatch: Expected "${id}", but schema has "${schema.$id}"`);
          // Fix the mismatch by updating the schema's $id to match what the router expects
          schema.$id = id;
        }
        
        // Ensure type is set
        if (!schema.type) {
          schema.type = 'object';
          fastify.log.warn(`Schema missing type: Added "type": "object" to ${id}`);
        }
        
        fastify.addSchema(schema);
      } catch (error) {
        fastify.log.error(`Error loading schema "${id}" from path "${path}":`, error);
        throw fastify.httpErrors.internalServerError(
          `Failed to load schema "${id}" from path "${path}"`,
          { cause: error }
        );
      }
    }
  });
  console.log('DOCS Module - Registered Schemas:', 
  schemas.map(s => s.id).filter(id => fastify.getSchema(id) !== undefined)
);
});
```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-docs",
  "ubiq_enhanced": false,
  "score": 0.272293091,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:a6a87f5f25105891"
}
```

---

### Chunk 6/29
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 8386 characters
- **Score**: 0.260547638
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
// docsPubsubListener.js
'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');

async function docsPubsubListener(fastify, options) {  
  const pubSubClient = fastify.diContainer.resolve('pubSubClient');
  const subscriptionName = 'docs-sub';
  const subscription = pubSubClient.subscription(subscriptionName);

  // Error handling for the subscription stream
  subscription.on('error', (error) => {
    fastify.log.error(`Pub/Sub Subscription Error (${subscriptionName}):`, error);
  });

  // Message handler for the subscription stream
  subscription.on('message', async (message) => {
    fastify.log.info(`Received docs message ${message.id} on subscription ${subscriptionName}`);

    try {
      const data = JSON.parse(message.data.toString());

      if (data.event === 'fetchDocsRequest') {
        const { userId, repoId, correlationId } = data.payload;
        fastify.log.info(`Processing fetchDocs event for user: ${userId}, repo: ${repoId}, correlation: ${correlationId}`);

        if (typeof fastify.fetchDocs === 'function') {
          // Create mock request object for fetchDocs
          const mockRequest = {
            params: { repoId },
            user: { id: userId },
            userId // Fallback for compatibility
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const docs = await fastify.fetchDocs(mockRequest, mockReply);
          
          fastify.log.info(`Docs fetched via PubSub: ${JSON.stringify(docs)}`);
          
          // Publish the result event if needed
          const docsPubsubAdapter = await fastify.diScope.resolve('docsPubsubAdapter');
          if (docsPubsubAdapter && correlationId) {
            await docsPubsubAdapter.publishDocsFetchedEvent(docs, correlationId);
            fastify.log.info(`Docs fetch result published for message ${message.id}`);
          }
        } else {
          fastify.log.error(`fastify.fetchDocs is not defined. Cannot process message ${message.id}.`);
          message.nack();
          return;
        }

      } else if (data.event === 'fetchPage') {
        const { userId, repoId, pageId, correlationId } = data.payload;
        fastify.log.info(`Processing fetchPage event for user: ${userId}, repo: ${repoId}, page: ${pageId}, correlation: ${correlationId}`);

        if (typeof fastify.fetchPage === 'function') {
          // Create mock request object for fetchPage
          const mockRequest = {
            params: { repoId, pageId },
            user: { id: userId },
            userId // Fallback for compatibility
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const page = await fastify.fetchPage(mockRequest, mockReply);
          
          fastify.log.info(`Docs page fetched via PubSub: ${JSON.stringify(page)}`);
          
          // Publish the result event if needed
          const docsPubsubAdapter = await fastify.diScope.resolve('docsPubsubAdapter');
          if (docsPubsubAdapter && correlationId) {
            await docsPubsubAdapter.publishPageFetchedEvent(page, correlationId);
            fastify.log.info(`Page fetch result published for message ${message.id}`);
          }
        } else {
          fastify.log.error(`fastify.fetchPage is not defined. Cannot process message ${message.id}.`);
          message.nack();
          return;
        }

      } else if (data.event === 'createPage') {
        const { userId, repoId, pageTitle, correlationId } = data.payload;
        fastify.log.info(`Processing createPage event for user: ${userId}, repo: ${repoId}, title: ${pageTitle}, correlation: ${correlationId}`);

        if (typeof fastify.createPage === 'function') {
          // Create mock request object for createPage
          const mockRequest = {
            params: { repoId },
            body: { pageTitle },
            user: { id: userId },
            userId // Fallback for compatibility
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const result = await fastify.createPage(mockRequest, mockReply);
          
          fastify.log.info(`Docs page created via PubSub: ${JSON.stringify(result)}`);
          
          // Publish the result event if needed
          const docsPubsubAdapter = await fastify.diScope.resolve('docsPubsubAdapter');
          if (docsPubsubAdapter && correlationId) {
            await docsPubsubAdapter.publishPageCreatedEvent(result, correlationId);
            fastify.log.info(`Page creation result published for message ${message.id}`);
          }
        } else {
          fastify.log.error(`fastify.createPage is not defined. Cannot process message ${message.id}.`);
          message.nack();
          return;
        }

      } else if (data.event === 'updatePage') {
        const { userId, repoId, pageId, newContent, correlationId } = data.payload;
        fastify.log.info(`Processing updatePage event for user: ${userId}, repo: ${repoId}, page: ${pageId}, correlation: ${correlationId}`);

        if (typeof fastify.updatePage === 'function') {
          // Create mock request object for updatePage
          const mockRequest = {
            params: { repoId, pageId },
            body: { newContent },
            user: { id: userId },
            userId // Fallback for compatibility
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const result = await fastify.updatePage(mockRequest, mockReply);
          
          fastify.log.info(`Docs page updated via PubSub: ${JSON.stringify(result)}`);
          
          // Publish the result event if needed
          const docsPubsubAdapter = await fastify.diScope.resolve('docsPubsubAdapter');
          if (docsPubsubAdapter && correlationId) {
            await docsPubsubAdapter.publishPageUpdatedEvent(result, correlationId);
            fastify.log.info(`Page update result published for message ${message.id}`);
          }
        } else {
          fastify.log.error(`fastify.updatePage is not defined. Cannot process message ${message.id}.`);
          message.nack();
          return;
        }

      } else if (data.event === 'deletePage') {
        const { userId, repoId, pageId, correlationId } = data.payload;
        fastify.log.info(`Processing deletePage event for user: ${userId}, repo: ${repoId}, page: ${pageId}, correlation: ${correlationId}`);

        if (typeof fastify.deletePage === 'function') {
          // Create mock request object for deletePage
          const mockRequest = {
            params: { repoId, pageId },
            user: { id: userId },
            userId // Fallback for compatibility
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const result = await fastify.deletePage(mockRequest, mockReply);
          
          fastify.log.info(`Docs page deleted via PubSub: ${JSON.stringify(result)}`);
          
          // Publish the result event if needed
          const docsPubsubAdapter = await fastify.diScope.resolve('docsPubsubAdapter');
          if (docsPubsubAdapter && correlationId) {
            await docsPubsubAdapter.publishPageDeletedEvent(result, correlationId);
            fastify.log.info(`Page deletion result published for message ${message.id}`);
          }
        } else {
          fastify.log.error(`fastify.deletePage is not defined. Cannot process message ${message.id}.`);
          message.nack();
          return;
        }

      } else {
        fastify.log.warn(`Unknown event type "${data.event}" for message ${message.id}.`);
      }

      message.ack(); // Acknowledge the message upon successful processing
    } catch (error) {
      fastify.log.error(`Error processing docs message ${message.id}:`, error);
      message.nack(); // Nack the message to re-queue it for another attempt
    }
  });

  fastify.log.info(`Listening for Docs messages on Pub/Sub subscription: ${subscriptionName}...`);

  // Ensure the subscription is closed when the Fastify app closes
  fastify.addHook('onClose', async () => {
    fastify.log.info(`Closing Pub/Sub subscription: ${subscriptionName}.`);
    await subscription.close();
  });
}

module.exports = fp(docsPubsubListener);
```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-docs",
  "ubiq_enhanced": false,
  "score": 0.260547638,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:7372d7728f242b75"
}
```

---

### Chunk 7/29
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 10143 characters
- **Score**: 0.561981201
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
// AIService.js
/* eslint-disable no-unused-vars */
'use strict';

const IAIService = require('./interfaces/IAIService');
const AIResponse = require('../../domain/entities/aiResponse');
const PushedRepo = require('../../domain/entities/pushedRepo');
const UserId = require('../../domain/value_objects/userId');
const RepoId = require('../../domain/value_objects/repoId');
const Prompt = require('../../domain/value_objects/prompt');
const AiResponseGeneratedEvent = require('../../domain/events/aiResponseGeneratedEvent');
const RepoPushedEvent = require('../../domain/events/repoPushedEvent');

class AIService extends IAIService {
  constructor({ aiAdapter, aiPersistAdapter, aiMessagingAdapter }) {
    super();
    this.aiAdapter = aiAdapter;
    this.aiPersistAdapter = aiPersistAdapter;
    this.aiMessagingAdapter = aiMessagingAdapter;
    
    // Initialize text search if postgres adapter is available and text search not yet initialized
    if (this.aiPersistAdapter && this.aiAdapter && typeof this.aiAdapter.initializeTextSearch === 'function') {
      // Don't block constructor, initialize asynchronously
      setImmediate(async () => {
        try {
          // Check if already initialized
          if (!this.aiAdapter.textSearchService) {
            await this.aiAdapter.initializeTextSearch(this.aiPersistAdapter);
            console.log(`[${new Date().toISOString()}] ✅ Text search initialized in AIService constructor`);
          }
        } catch (error) {
          console.warn(`[${new Date().toISOString()}] ⚠️  Could not initialize text search: ${error.message}`);
        }
      });
    }
  }

  async respondToPrompt(userId, conversationId, prompt) {
    try {
      const userIdVO = new UserId(userId);
      const promptVO = new Prompt(prompt);
      console.log(`[${new Date().toISOString()}] AI service processing prompt for user ${userIdVO.value}: "${promptVO.text.substring(0, 50)}..."`);
      
      // Retrievee conversation history from database (Clean Architecture: Service handles data access)
      let conversationHistory = [];
      if (this.aiPersistAdapter && conversationId) {
        try {
          conversationHistory = await this.aiPersistAdapter.getConversationHistory(conversationId, 8);
          console.log(`[${new Date().toISOString()}] Retrieved ${conversationHistory.length} conversation history items`);
        } catch (historyError) {
          console.warn(`[${new Date().toISOString()}] Could not retrieve conversation history:`, historyError.message);
          conversationHistory = [];
        }
      }
      
      // Call the domain entity to get the response and event
      const aiResponse = new AIResponse(userIdVO);
      const { response } = await aiResponse.respondToPrompt(userIdVO, conversationId, promptVO, this.aiAdapter, conversationHistory);
      // Create and publish domain event
      const event = new AiResponseGeneratedEvent({
        userId: userIdVO.value,
        conversationId,
        prompt: promptVO.text,
        response
      });
      if (this.aiMessagingAdapter) {
        try {
          await this.aiMessagingAdapter.publishAiResponse('aiResponseGenerated', event);
        } catch (messagingError) {
          console.error('Error publishing AiResponseGeneratedEvent:', messagingError);
        }
      }
      // Save the response to the database - but don't block on failure
      try {
        if (this.aiPersistAdapter) {
          await this.aiPersistAdapter.saveAiResponse({
            userId: userIdVO.value, 
            conversationId, 
            repoId: null, // Optional field
            prompt: promptVO.text, 
            response: typeof response === 'object' ? JSON.stringify(response) : response
          });
          console.log(`[${new Date().toISOString()}] Saved AI response to database`);
        } else {
          console.warn(`[${new Date().toISOString()}] aiPersistAdapter is not available, skipping database save`);
        }
      } catch (dbError) {
        console.error(`[${new Date().toISOString()}] Failed to save AI response to database:`, dbError.message);
        // Continue even if database save fails - don't rethrow
      }
      // Return the response - extract content if it's an object with response property
      if (typeof response === 'object' && response !== null) {
        return response.response || response;
      }
      return response;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in AI service:`, error);
      
      // Check if it's an OpenAI API error related to quotas
      if (error.message && (
          error.message.includes('quota') || 
          error.message.includes('rate limit') || 
          error.message.includes('429')
        )) {
        return {
          success: false,
          response: "I'm currently experiencing high demand. Please try again in a few moments while I optimize my resources.",
          error: error.message
        };
      }
      
      // For any other error, let's provide a cleaner message
      return {
        success: false,
        response: "Sorry, I encountered a technical issue. Please try again shortly.",
        error: error.message
      };
    }
  }

  async processPushedRepo(userId, repoId, repoData) {
    try {
      const userIdVO = new UserId(userId);
      const repoIdVO = new RepoId(repoId);
      console.log(`[${new Date().toISOString()}] Processing pushed repository for user: ${userIdVO.value}, repository: ${repoIdVO.value}`);
      
      // CRITICAL: Ensure text search is initialized before processing repo
      if (this.aiPersistAdapter && this.aiAdapter && typeof this.aiAdapter.initializeTextSearch === 'function') {
        if (!this.aiAdapter.textSearchService) {
          console.log(`[${new Date().toISOString()}] 🔍 Initializing text search before repo processing...`);
          try {
            await this.aiAdapter.initializeTextSearch(this.aiPersistAdapter);
            console.log(`[${new Date().toISOString()}] ✅ Text search initialized successfully before repo processing`);
          } catch (error) {
            console.warn(`[${new Date().toISOString()}] ⚠️  Text search initialization failed (non-fatal): ${error.message}`);
          }
        } else {
          console.log(`[${new Date().toISOString()}] ℹ️  Text search already initialized`);
        }
      }
      
      const pushedRepo = new PushedRepo(userIdVO, repoIdVO);
      const { response } = await pushedRepo.processPushedRepo(userIdVO, repoIdVO, repoData, this.aiAdapter);
      // Create and publish domain event
      const event = new RepoPushedEvent({
        userId: userIdVO.value,
        repoId: repoIdVO.value,
        repoData
      });
      if (this.aiMessagingAdapter) {
        try {
          await this.aiMessagingAdapter.publishAiResponse('repoPushed', event);
        } catch (messagingError) {
          console.error('Error publishing RepoPushedEvent:', messagingError);
        }
      }
      // Save the data to the database
      try {
        if (this.aiPersistAdapter) {
          await this.aiPersistAdapter.saveRepoPush({
            userId: userIdVO.value,
            repoId: repoIdVO.value,
            repoData,
            response: typeof response === 'object' ? JSON.stringify(response) : response
          });
          console.log(`[${new Date().toISOString()}] Saved pushed repo to database`);
        } else {
          console.warn(`[${new Date().toISOString()}] aiPersistAdapter is not available, skipping database save`);
        }
      } catch (dbError) {
        console.error(`[${new Date().toISOString()}] Failed to save pushed repo to database:`, dbError.message);
        // Continue even if database save fails - don't rethrow
      }
      return response;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error processing repository:`, error);
      throw error;
    }
  }
  
  // New method to handle question generation from events
  async generateResponse(prompt, userId) {
    console.log(`[${new Date().toISOString()}] 🤖 AI SERVICE: Generating response for user ${userId}, prompt: "${prompt.substring(0, 100)}..."`);
    
    try {
      // Set the userId on the adapter if it's not already set
      if (this.aiAdapter && this.aiAdapter.setUserId) {
        await this.aiAdapter.setUserId(userId);
        console.log(`[${new Date().toISOString()}] 🤖 AI SERVICE: Set userId ${userId} on AI adapter`);
      } else {
        console.warn(`[${new Date().toISOString()}] 🤖 AI SERVICE: Unable to set userId - aiAdapter missing or lacks setUserId method`);
        // Continue anyway - it might still work
      }
      
      // Validate the prompt
      if (!prompt) {
        console.error(`[${new Date().toISOString()}] 🤖 AI SERVICE: Empty prompt received, returning default response`);
        return "I'm sorry, but I didn't receive a question to answer. Could you please ask again?";
      }
      
      // Use the existing respondToPrompt method with a generated conversation ID if none was provided
      const conversationId = `gen-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const response = await this.respondToPrompt(userId, conversationId, prompt);
      
      if (response) {
        const responseText = typeof response === 'object' ? 
          (response.response || JSON.stringify(response)) : 
          response;
          
        console.log(`[${new Date().toISOString()}] 🤖 AI SERVICE: Generated response: "${responseText.substring(0, 100)}..."`);
        return responseText;
      } else {
        console.warn(`[${new Date().toISOString()}] 🤖 AI SERVICE: Got empty response from AI adapter, returning default message`);
        return "I'm sorry, but I couldn't generate a response at this time. Please try again later.";
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 🤖 AI SERVICE: Error generating response:`, error);
      return `I apologize, but I encountered an error while processing your request: ${error.message}. Please try again later.`;
    }
  }
}

module.exports = AIService;
```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.561981201,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:3748242fdecdbb5a"
}
```

---

### Chunk 8/29
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 12115 characters
- **Score**: 0.50594908
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
// aiController.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function aiController(fastify, options) {


    fastify.decorate('respondToPrompt', async (request, reply) => {
      try {
        const { conversationId, prompt } = request.body;
        const userId = request.user.id;
        
        fastify.log.info(`🤖 AI Controller: Processing prompt for user ${userId}, conversation ${conversationId}`);
           // Check if diScope is available
      if (!request.diScope) {
        fastify.log.error('❌ AI Controller: diScope is missing in request');
        // Fallback: create scope manually
        request.diScope = fastify.diContainer.createScope();
        fastify.log.info('✅ AI Controller: Created diScope manually as fallback');
      }
        
        const aiService = await request.diScope.resolve('aiService');
        if (!aiService) {
          fastify.log.error('❌ AI Controller: Failed to resolve aiService from diScope');
          throw new Error('aiService could not be resolved');
        }
        
        // Check and set userId on adapter if needed
        if (aiService.aiAdapter && typeof aiService.aiAdapter.setUserId === 'function') {
          await aiService.aiAdapter.setUserId(userId);
          fastify.log.debug(`🔧 AI Controller: userId set on adapter: ${userId}`);
        }
        
        // Ensure persistence adapter is available for conversation history
        if (aiService.aiAdapter && aiService.aiPersistAdapter && typeof aiService.aiAdapter.setPersistenceAdapter === 'function') {
          aiService.aiAdapter.setPersistenceAdapter(aiService.aiPersistAdapter);
          fastify.log.debug(`🔧 AI Controller: persistence adapter set on AI adapter for conversation history`);
        }
        
        const TIMEOUT_MS = 90000; // Increased from 60s to 90s
        fastify.log.debug(`🔧 AI Controller: Timeout set to ${TIMEOUT_MS}ms`);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AI request processing timeout')), TIMEOUT_MS);
        });

        const responsePromise = aiService.respondToPrompt(userId, conversationId, prompt);
        const response = await Promise.race([responsePromise, timeoutPromise]);
        
        return { 
          response,
          status: 'success',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        fastify.log.error(`❌ AI Controller error:`, error);
        if (error.stack) {
          fastify.log.error(`❌ AI Controller error stack: ${error.stack}`);
        }
        throw fastify.httpErrors.internalServerError('Failed to process AI request', { cause: error });
      }
    });

    fastify.decorate('processPushedRepo', async (request, reply) => {
    try {
      const { repoId, repoData} = request.body;
      const userId = request.user.id; 
      fastify.log.info(`Processing pushed repository for user: ${userId}, repository: ${repoId}`);
      
      // Ensure diScope is available
      if (!request.diScope) {
        request.diScope = fastify.diContainer.createScope();
        fastify.log.info('✅ Created diScope manually as fallback');
      }
      
      const aiService = await request.diScope.resolve('aiService');
      if (!aiService) {
        throw new Error('AI service not found in DI container');
      }
      
      const response = await aiService.processPushedRepo(userId, repoId, repoData);
      
      fastify.log.info(`pushed repo processed: ${repoId}`);
      return response;
    } catch (error) {
      fastify.log.error('Error processing pushed repo:', error);
      throw fastify.httpErrors.internalServerError('Failed to process pushed repo:', { cause: error });
    }
  });

  fastify.decorate('manualProcessRepoDirect', async (request, reply) => {
    try {
      const { repoId, githubOwner, repoName, branch = 'main', repoUrl } = request.body;
      const userId = request.user.id;
      
      fastify.log.info(`Manual direct repo processing requested for user: ${userId}, repository: ${repoId}`);
      
      // Construct repoData from the provided parameters
      const constructedRepoData = {
        githubOwner: githubOwner || repoId.split('/')[0],
        repoName: repoName || repoId.split('/')[1],
        repoUrl: repoUrl || `https://github.com/${repoId}`,
        branch: branch,
        description: `Manual processing of ${repoId}`,
        timestamp: new Date().toISOString()
      };
      
      // Validate constructed data
      if (!constructedRepoData.githubOwner || !constructedRepoData.repoName) {
        throw new Error('Invalid repoId format or missing githubOwner/repoName. Expected format: "owner/repo-name"');
      }
      
      fastify.log.info(`Constructed repo data:`, constructedRepoData);
      
      // Ensure diScope is available
      if (!request.diScope) {
        request.diScope = fastify.diContainer.createScope();
        fastify.log.info('✅ Created diScope manually as fallback');
      }
      
      const aiService = await request.diScope.resolve('aiService');
      if (!aiService) {
        throw new Error('AI service not found in DI container');
      }
      
      // Process the repository directly using AI service
      const response = await aiService.processPushedRepo(userId, repoId, constructedRepoData);
      
      fastify.log.info(`Manual direct repo processing completed: ${repoId}`);
      
      return {
        success: true,
        message: 'Repository processed successfully via direct method',
        repoId,
        repoData: constructedRepoData,
        data: response
      };
    } catch (error) {
      fastify.log.error('Error in manual direct repo processing:', error);
      throw fastify.httpErrors.internalServerError('Failed to process repository manually', { cause: error });
    }
  });

  // Text search endpoint handler
  fastify.decorate('searchText', async (request, reply) => {
    try {
      const { query, repoId, limit = 10, offset = 0 } = request.query;
      const userId = request.user?.id || request.userId;
      
      fastify.log.info(`🔍 AI Controller: Text search for user ${userId}, query: "${query}"`);
      
      const aiService = await request.diScope.resolve('aiService');
      if (!aiService) {
        throw new Error('AI service not found in DI container');
      }

      // Initialize text search if not already done
      if (!aiService.aiAdapter.textSearchService) {
        const postgresAdapter = await request.diScope.resolve('aiPersistAdapter');
        await aiService.aiAdapter.initializeTextSearch(postgresAdapter);
      }

      // Set userId if needed
      if (aiService.aiAdapter && typeof aiService.aiAdapter.setUserId === 'function') {
        await aiService.aiAdapter.setUserId(userId);
      }

      const results = await aiService.aiAdapter.searchText(query, {
        repoId,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      return {
        results,
        query,
        totalResults: results.length,
        searchType: 'text'
      };
    } catch (error) {
      fastify.log.error('Error in text search:', error);
      throw fastify.httpErrors.internalServerError('Text search failed', { cause: error });
    }
  });

  // Hybrid search endpoint handler
  fastify.decorate('searchHybrid', async (request, reply) => {
    try {
      const { 
        query, 
        repoId, 
        limit = 10, 
        includeVector = true, 
        includeText = true, 
        strategy = 'interleave' 
      } = request.query;
      const userId = request.user?.id || request.userId;
      
      fastify.log.info(`🔄 AI Controller: Hybrid search for user ${userId}, query: "${query}"`);
      
      const aiService = await request.diScope.resolve('aiService');
      if (!aiService) {
        throw new Error('AI service not found in DI container');
      }

      // Initialize text search if not already done
      if (!aiService.aiAdapter.hybridSearchService) {
        const postgresAdapter = await request.diScope.resolve('aiPersistAdapter');
        await aiService.aiAdapter.initializeTextSearch(postgresAdapter);
      }

      // Set userId if needed
      if (aiService.aiAdapter && typeof aiService.aiAdapter.setUserId === 'function') {
        await aiService.aiAdapter.setUserId(userId);
      }

      const results = await aiService.aiAdapter.searchHybrid(query, {
        repoId,
        limit: parseInt(limit),
        includeVector: includeVector === 'true',
        includeText: includeText === 'true',
        strategy
      });

      // Calculate search stats
      const vectorResults = results.filter(r => r.searchType === 'vector').length;
      const textResults = results.filter(r => r.searchType === 'text' || r.searchType === 'simple_text').length;
      
      return {
        results,
        query,
        totalResults: results.length,
        searchType: 'hybrid',
        searchStats: {
          vectorResults,
          textResults
        }
      };
    } catch (error) {
      fastify.log.error('Error in hybrid search:', error);
      throw fastify.httpErrors.internalServerError('Hybrid search failed', { cause: error });
    }
  });

  // Search capabilities endpoint handler
  fastify.decorate('getSearchCapabilities', async (request, reply) => {
    try {
      const userId = request.user?.id || request.userId;
      
      fastify.log.info(`📊 AI Controller: Getting search capabilities for user ${userId}`);
      
      const aiService = await request.diScope.resolve('aiService');
      if (!aiService) {
        throw new Error('AI service not found in DI container');
      }

      // Initialize text search if not already done
      if (!aiService.aiAdapter.textSearchService) {
        try {
          const postgresAdapter = await request.diScope.resolve('aiPersistAdapter');
          await aiService.aiAdapter.initializeTextSearch(postgresAdapter);
        } catch (error) {
          fastify.log.warn('Could not initialize text search for capabilities check:', error.message);
        }
      }

      // Set userId if needed
      if (aiService.aiAdapter && typeof aiService.aiAdapter.setUserId === 'function') {
        await aiService.aiAdapter.setUserId(userId);
      }

      const capabilities = await aiService.aiAdapter.getSearchCapabilities();
      
      return capabilities;
    } catch (error) {
      fastify.log.error('Error getting search capabilities:', error);
      throw fastify.httpErrors.internalServerError('Failed to get search capabilities', { cause: error });
    }
  });

  // Test search systems endpoint handler
  fastify.decorate('testSearchSystems', async (request, reply) => {
    try {
      const { testQuery = 'function' } = request.body || {};
      const userId = request.user?.id || request.userId;
      
      fastify.log.info(`🧪 AI Controller: Testing search systems for user ${userId} with query: "${testQuery}"`);
      
      const aiService = await request.diScope.resolve('aiService');
      if (!aiService) {
        throw new Error('AI service not found in DI container');
      }

      // Initialize text search if not already done
      if (!aiService.aiAdapter.textSearchService) {
        try {
          const postgresAdapter = await request.diScope.resolve('aiPersistAdapter');
          await aiService.aiAdapter.initializeTextSearch(postgresAdapter);
        } catch (error) {
          fastify.log.warn('Could not initialize text search for testing:', error.message);
        }
      }

      // Set userId if needed
      if (aiService.aiAdapter && typeof aiService.aiAdapter.setUserId === 'function') {
        await aiService.aiAdapter.setUserId(userId);
      }

      const testResults = await aiService.aiAdapter.testSearchSystems(testQuery);
      
      return testResults;
    } catch (error) {
      fastify.log.error('Error testing search systems:', error);
      throw fastify.httpErrors.internalServerError('Failed to test search systems', { cause: error });
    }
  });

}

module.exports = fp(aiController);
```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.50594908,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:34252dea0c111df7"
}
```

---

### Chunk 9/29
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 434 characters
- **Score**: 0.491272
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
/* eslint-disable no-unused-vars */
'use strict';

class IAIService {
  constructor() {
    if (new.target === IAIService) {
      throw new Error('Cannot instantiate an interface.');
    }
  }

  async respondToPrompt(userId, conversationId, prompt) {
    throw new Error('Method not implemented.');
  }

  async processPushedRepo(userId, repoId) {
    throw new Error('Method not implemented.');
  }
}

module.exports = IAIService;

```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.491272,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:05a2fe4caa922298"
}
```

---

### Chunk 10/29
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 4198 characters
- **Score**: 0.478660583
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
// ai/index.js
'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');
const fs = require('fs');
const path = require('path');
const autoload = require('@fastify/autoload');
const aiPubsubListener = require('./input/aiPubsubListener');

module.exports = async function aiModuleIndex(fastify, opts) {
  fastify.log.info('✅ ai/index.js was registered');

  const allFiles = fs.readdirSync(__dirname);
  fastify.log.info(`Files in ai_module: ${JSON.stringify(allFiles)}`);

  // Load application controllers
  await fastify.register(autoload, {
    dir: path.join(__dirname, 'application'),
    encapsulate: false,
    maxDepth: 1,
    matchFilter: (filepath) => filepath.includes('Controller'),
    dirNameRoutePrefix: false
  });

  await fastify.register(autoload, {
    dir: path.join(__dirname, 'input'),
    encapsulate: true,
    maxDepth: 1,
    matchFilter: (filepath) => filepath.includes('Router'),
    dirNameRoutePrefix: false,
    prefix: ''
  });

  // First, let's ensure eventDispatcher is available by checking the DI container
  let eventDispatcherFound = false;
  
  if (fastify.diContainer) {
    try {
      // Log all registrations in debug mode to help troubleshoot
      try {
        const allRegistrations = await fastify.diContainer.listRegistrations();
        fastify.log.debug(`🔍 AI MODULE: DI container has the following registrations: ${JSON.stringify(allRegistrations)}`);
      } catch (listError) {
        fastify.log.debug(`⚠️ AI MODULE: Could not list DI registrations: ${listError.message}`);
      }

      if (await fastify.diContainer.hasRegistration('eventDispatcher')) {
        const eventDispatcher = await fastify.diContainer.resolve('eventDispatcher');
        // Make sure we don't overwrite an existing decorator
        if (!fastify.hasDecorator('eventDispatcher')) {
          fastify.decorate('eventDispatcher', eventDispatcher);
          fastify.log.info('✅ AI MODULE: eventDispatcher found in DI container and registered as decorator');
        } else {
          fastify.log.info('✅ AI MODULE: eventDispatcher decorator already exists, not overwriting');
        }
        eventDispatcherFound = true;
      } else {
        fastify.log.warn('⚠️ AI MODULE: eventDispatcher not found in DI container, trying direct import');
        
        // Try to import directly from eventDispatcher.js
        try {
          const { eventDispatcher } = require('../../eventDispatcher');
          if (eventDispatcher) {
            if (!fastify.hasDecorator('eventDispatcher')) {
              fastify.decorate('eventDispatcher', eventDispatcher);
              fastify.log.info('✅ AI MODULE: eventDispatcher imported directly and registered as decorator');
            } else {
              fastify.log.info('✅ AI MODULE: eventDispatcher decorator already exists (from direct import)');
            }
            eventDispatcherFound = true;
          }
        } catch (importError) {
          fastify.log.error(`❌ AI MODULE: Failed to import eventDispatcher: ${importError.message}`);
        }
      }
    } catch (diError) {
      fastify.log.error(`❌ AI MODULE: Error accessing DI container: ${diError.message}`);
    }
  } else {
    fastify.log.error('❌ AI MODULE: DI container not available');
  }
  
  // Register the AI pubsub listener
  await fastify.register(aiPubsubListener);
  fastify.log.info(`aiPubsubListener registered: ${!!fastify.aiPubsubListener}`);
  
  // Check if event dispatcher is available - check both the decorator and the DI container flag
  if (fastify.eventDispatcher) {
    fastify.log.info('✅ AI MODULE: eventDispatcher is available as a fastify decorator');
  } else if (eventDispatcherFound) {
    fastify.log.info('✅ AI MODULE: eventDispatcher is available through the DI container');
  } else if (fastify.diContainer && await fastify.diContainer.hasRegistration('eventDispatcher')) {
    // One final check directly with the DI container
    fastify.log.info('✅ AI MODULE: eventDispatcher is available in the DI container');
  } else {
    fastify.log.error('❌ AI MODULE: eventDispatcher is NOT available through any source');
  }
 

};

module.exports.autoPrefix = '/api/ai';
```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.478660583,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:77a1b863d9556d37"
}
```

---

### Chunk 11/29
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 24223 characters
- **Score**: 0.435316086
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
// aiLangchainAdapter.js
"use strict";
/* eslint-disable no-unused-vars */

const IAIPort = require('../../domain/ports/IAIPort');
const { OpenAIEmbeddings } = require('@langchain/openai');

// Import extracted utility functions
const RequestQueue = require('./requestQueue');
const LLMProviderManager = require('./providers/lLMProviderManager');

// Import the ContextPipeline for handling repository processing
const ContextPipeline = require('./rag_pipelines/context/contextPipeline');
const QueryPipeline = require('./rag_pipelines/query/queryPipeline');

// LangSmith tracing (optional)
let wrapOpenAI, traceable;
try {
  ({ wrapOpenAI } = require('langsmith/wrappers'));
  ({ traceable } = require('langsmith/traceable'));
} catch (err) {
  if (process.env.LANGSMITH_TRACING === 'true') {
    console.warn(`[${new Date().toISOString()}] [TRACE] LangSmith packages not found or failed to load: ${err.message}`);
  }
}

class AILangchainAdapter extends IAIPort {
  constructor(options = {}) {
    super();

    // Make userId null by default to avoid DI error
    this.userId = null;

    // Get provider from infraConfig or options
    this.aiProvider = options.aiProvider || 'openai';
    console.log(`[${new Date().toISOString()}] AILangchainAdapter initializing with provider: ${this.aiProvider}`);

    // Get access to the event bus for status updates
    try {
      const { eventBus } = require('../../../../eventDispatcher');
      this.eventBus = eventBus;
      console.log(`[${new Date().toISOString()}] 📡 Successfully connected to shared event bus`);
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Could not access shared event bus: ${error.message}`);
      this.eventBus = null;
      console.log(`[${new Date().toISOString()}] [DEBUG] Event bus unavailable.`);
    }

    // Initialize request queue for rate limiting and queuing
    this.requestQueue = new RequestQueue({
      maxRequestsPerMinute: 60,  // Increased from 20 to 60 for better throughput
      retryDelay: 2000,          // Reduced from 5000ms to 2000ms for faster retries
      maxRetries: 5              // Increased retries for better reliability
    });

    // Keep direct access to pineconeLimiter for backward compatibility
    this.pineconeLimiter = this.requestQueue.pineconeLimiter;

    try {
      // Initialize embeddings model: converts text to vectors
      this.embeddings = new OpenAIEmbeddings({
        model: 'text-embedding-3-large',
        apiKey: process.env.OPENAI_API_KEY
      });
      console.log(`[${new Date().toISOString()}] [DEBUG] Embeddings model initialized.`);

      // Initialize chat model based on provider
      this.llmProviderManager = new LLMProviderManager(this.aiProvider, {
        maxRetries: this.requestQueue.maxRetries
      });
      this.llm = this.llmProviderManager.getLLM();
      console.log(`[${new Date().toISOString()}] [DEBUG] LLM initialized.`);

      // LangSmith tracing toggle
      this.enableTracing = process.env.LANGSMITH_TRACING === 'true';
      if (this.enableTracing) {
        console.log(`[${new Date().toISOString()}] [TRACE] LangSmith tracing enabled (adapter level)`);
        console.log(`[${new Date().toISOString()}] [TRACE] LangSmith env summary: project=${process.env.LANGCHAIN_PROJECT || 'eventstorm-trace'} apiKeySet=${!!process.env.LANGSMITH_API_KEY} workspaceIdSet=${!!process.env.LANGSMITH_WORKSPACE_ID} organizationName=${process.env.LANGSMITH_ORGANIZATION_NAME || 'n/a'}`);
      }

      // Attempt to wrap underlying OpenAI client if available & tracing enabled
      if (this.enableTracing && this.aiProvider === 'openai' && wrapOpenAI) {
        try {
          // Common patterns for underlying client reference
          if (this.llm?.client) {
            this.llm.client = wrapOpenAI(this.llm.client);
            console.log(`[${new Date().toISOString()}] [TRACE] Wrapped this.llm.client with LangSmith`);
          } else if (this.llm?._client) {
            this.llm._client = wrapOpenAI(this.llm._client);
            console.log(`[${new Date().toISOString()}] [TRACE] Wrapped this.llm._client with LangSmith`);
          } else {
            console.log(`[${new Date().toISOString()}] [TRACE] No direct raw OpenAI client found to wrap (LangChain may auto-instrument).`);
          }
        } catch (wrapErr) {
          console.warn(`[${new Date().toISOString()}] [TRACE] Failed to wrap OpenAI client: ${wrapErr.message}`);
        }
      }

      // Don't initialize vectorStore until we have a userId
      this.vectorStore = null;
      console.log(`[${new Date().toISOString()}] [DEBUG] Vector store set to null (will be initialized after userId).`);

      // Initialize ContextPipeline for repository processing
      this.contextPipeline = new ContextPipeline({
        embeddings: this.embeddings,
        eventBus: this.eventBus,
        pineconeLimiter: this.pineconeLimiter,
        maxChunkSize: 1500,  // Optimized for better semantic chunking and embedding quality
        chunkOverlap: 200    // Add overlap for better context preservation
      });
      console.log(`[${new Date().toISOString()}] [DEBUG] ContextPipeline initialized with embedded Pinecone services.`);

  // System documentation is processed via the normal docs pipeline when triggered

      // Initialize shared Pinecone resources that will be used by QueryPipeline
      this.pineconePlugin = null;
      this.vectorSearchOrchestrator = null;
      if (process.env.PINECONE_API_KEY) {
        const PineconePlugin = require('./rag_pipelines/context/embedding/pineconePlugin');
        const VectorSearchOrchestrator = require('./rag_pipelines/query/vectorSearchOrchestrator');
        
        this.pineconePlugin = new PineconePlugin();
        this.vectorSearchOrchestrator = new VectorSearchOrchestrator({
          embeddings: this.embeddings,
          rateLimiter: this.requestQueue?.pineconeLimiter,
          pineconePlugin: this.pineconePlugin,
          apiKey: process.env.PINECONE_API_KEY,
          indexName: process.env.PINECONE_INDEX_NAME,
          region: process.env.PINECONE_REGION,
          defaultTopK: 10,
          defaultThreshold: 0.3,
          maxResults: 50
        });
        console.log(`[${new Date().toISOString()}] [DEBUG] Shared Pinecone resources initialized in AILangchainAdapter`);
      } else {
        console.warn(`[${new Date().toISOString()}] Missing Pinecone API key - vector services not initialized`);
      }

      // Initialize text search services
      this.textSearchService = null;
      this.hybridSearchService = null;
      console.log(`[${new Date().toISOString()}] [DEBUG] Text search services will be initialized after PostgresAdapter is available`);

      // Initialize QueryPipeline with shared Pinecone resources (no duplication)
      this.queryPipeline = new QueryPipeline({  
        embeddings: this.embeddings,
        llm: this.llm,
        eventBus: this.eventBus,
        requestQueue: this.requestQueue,
        maxRetries: this.requestQueue.maxRetries,
        // Pass shared Pinecone resources to avoid duplication
        pineconePlugin: this.pineconePlugin,
        vectorSearchOrchestrator: this.vectorSearchOrchestrator
      });
      console.log(`[${new Date().toISOString()}] [DEBUG] QueryPipeline initialized in constructor`);

      console.log(`[${new Date().toISOString()}] AILangchainAdapter initialized successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error initializing AILangchainAdapter:`, error.message);
      console.log(`[${new Date().toISOString()}] [DEBUG] Initialization error stack:`, error.stack);
      // We'll continue with degraded functionality and try to recover later
    }
  }

  /**
   * Extract GitHub user and repository name from various sources
   * This ensures consistent namespace generation across the system
   */
  extractGitHubInfo() {
    // Try to extract from environment variables first (most reliable)
    const envUser = process.env.GITHUB_USERNAME || process.env.GITHUB_USER;
    const envRepo = process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY_NAME;
    
    if (envUser && envRepo) {
      return {
        gitUser: envUser,
        gitRepo: envRepo
      };
    }

    // Try to extract from git config (local repository)
    try {
      const { execSync } = require('child_process');
      
      // Get remote origin URL
      const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
      
      // Parse GitHub URL (supports both HTTPS and SSH formats)
      const githubMatch = remoteUrl.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
      if (githubMatch) {
        return {
          gitUser: githubMatch[1], // Preservesss original case
          gitRepo: githubMatch[2]
        };
      }
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] Could not extract GitHub info from git config: ${error.message}`);
    }

    // Fallback to known correct values for this repository
    return {
      gitUser: 'anatolyZader', // Actual GitHub username (with capital Z)
      gitRepo: 'vc-3'
    };
  }

  // Add method to set userId after construction - this is crucial!
  async setUserId(userId) {
    if (!userId) {
      console.warn(`[${new Date().toISOString()}] Attempted to set null/undefined userId in AILangchainAdapter`);
      return this;
    }
    console.log(`[${new Date().toISOString()}] [DEBUG] setUserId called with: ${userId}`);

    this.userId = userId;
    console.log(`[${new Date().toISOString()}] [DEBUG] userId set to: ${this.userId}`);


    try {
      // Create vector store using shared Pinecone resources
      if (this.vectorSearchOrchestrator) {
        // TEMPORARY FIX: Hardcode the complete namespace that exists in Pinecone
        const repositoryNamespace = 'd41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3';
        console.log(`[${new Date().toISOString()}] [DEBUG] TEMP FIX: Using hardcoded namespace: ${repositoryNamespace}`);
        this.vectorStore = await this.vectorSearchOrchestrator.createVectorStore(this.userId);
        // Override with correct namespace
        this.vectorStore.namespace = repositoryNamespace;
        console.log(`[${new Date().toISOString()}] [DEBUG] Vector store created using shared orchestrator for userId: ${this.userId} with namespace: ${repositoryNamespace}`);
      } else {
        console.warn(`[${new Date().toISOString()}] No shared VectorSearchOrchestrator available - vector store not initialized`);
        this.vectorStore = null;
      }

      // Update QueryPipeline with userId and vectorStore
      if (this.queryPipeline) {
        this.queryPipeline.userId = this.userId;
        this.queryPipeline.vectorStore = this.vectorStore;
        console.log(`[${new Date().toISOString()}] [DEBUG] QueryPipeline updated with userId: ${this.userId} and vectorStore`);
      } else {
        console.warn(`[${new Date().toISOString()}] [DEBUG] QueryPipeline not found during setUserId - this should not happen`);
      }
      
      console.log(`[${new Date().toISOString()}] AILangchainAdapter userId updated to: ${this.userId}`);
      console.log(`[${new Date().toISOString()}] [DEBUG] QueryPipeline ready for userId: ${this.userId}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error creating vector store for user ${this.userId}:`, error.message);
      console.log(`[${new Date().toISOString()}] [DEBUG] Vector store creation error stack:`, error.stack);
      // Still set the userId even if vectorStore creation fails
    }

    return this;
  }

  /**
   * Initialize text search services with PostgreSQL adapter
   * Call this method after PostgreSQL adapter is available in DI container
   */
  async initializeTextSearch(postgresAdapter) {
    try {
      console.log(`[${new Date().toISOString()}] 🔍 Initializing text search services...`);
      
      const TextSearchService = require('../search/textSearchService');
      const HybridSearchService = require('../search/hybridSearchService');
      
      this.textSearchService = new TextSearchService({ 
        postgresAdapter,
        logger: console 
      });

      this.hybridSearchService = new HybridSearchService({
        vectorSearchOrchestrator: this.vectorSearchOrchestrator,
        textSearchService: this.textSearchService,
        logger: console
      });

      console.log(`[${new Date().toISOString()}] ✅ Text search services initialized successfully`);
      
      // Update QueryPipeline with text search services for hybrid search
      if (this.queryPipeline) {
        this.queryPipeline.textSearchService = this.textSearchService;
        this.queryPipeline.hybridSearchService = this.hybridSearchService;
        console.log(`[${new Date().toISOString()}] 🔄 QueryPipeline updated with text search services`);
      }
      
      // Update ContextPipeline with text search service for PostgreSQL storage
      if (this.contextPipeline) {
        this.contextPipeline.textSearchService = this.textSearchService;
        console.log(`[${new Date().toISOString()}] 🔄 ContextPipeline updated with text search service for PostgreSQL storage`);
      }
      
      // Test the services
      const isTextSearchAvailable = await this.textSearchService.isAvailable();
      console.log(`[${new Date().toISOString()}] 📊 Text search availability: ${isTextSearchAvailable}`);
      
      return true;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to initialize text search services:`, error.message);
      return false;
    }
  }

  // RAG Data Preparation Phase: Loading, chunking, and embedding (both core docs and repo code)
  async processPushedRepo(userId, repoId, repoData) {
    const { safeLog, createRepoDataSummary } = require('./rag_pipelines/context/utils/safeLogger');
    
    console.log(`[${new Date().toISOString()}] 📥 RAG REPO: Processing repo for user ${userId}: ${repoId}`);
    safeLog(`[${new Date().toISOString()}] 📥 RAG REPO: Received repoData structure:`, repoData); 
    
    // Emit starting status
    this.emitRagStatus('processing_started', {
      userId,
      repoId,
      timestamp: new Date().toISOString()
    });

    // Set userId if not already set
    if (this.userId !== userId) {
      await this.setUserId(userId);
    }

    try {
      console.log(`[${new Date().toISOString()}] � RAG REPO: Delegating to ContextPipeline with ubiquitous language support`);
      
      const result = await this.contextPipeline.processPushedRepo(userId, repoId, repoData);
      
      // Emit success status
      this.emitRagStatus('processing_completed', {
        userId,
        repoId,
        timestamp: new Date().toISOString(),
        result
      });

      console.log(`[${new Date().toISOString()}] ✅ RAG REPO: Repository processing completed with ubiquitous language enhancement`);
      return result;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error processing repository ${repoId}:`, error.message);
      
      // Emit error status
      this.emitRagStatus('processing_error', {
        userId,
        repoId,
        error: error.message,
        phase: 'repository_processing',
        processedAt: new Date().toISOString()
      });
      
      return {
        success: false,
        error: `Repository processing failed: ${error.message}`,
        userId: userId,
        repoId: repoId,
        processedAt: new Date().toISOString()
      };
    }
  }

  // 2. Retrieval anddd generation:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

  async respondToPrompt(userId, conversationId, prompt, conversationHistory = []) {
    const exec = async () => {
      await this.setUserId(userId);
      if (!this.userId) {
        console.warn(`[${new Date().toISOString()}] Failed to set userId in respondToPrompt. Provided userId: ${userId}`);
        return {
          success: false,
          response: "I'm having trouble identifying your session. Please try again in a moment.",
          conversationId: conversationId,
          timestamp: new Date().toISOString()
        };
      }

      console.log(`[${new Date().toISOString()}] Processing AI request for conversation ${conversationId}`);

      // Use the queue system for all AI operations
      return this.requestQueue.queueRequest(async () => {
        try {
          // Delegate to QueryPipeline for RAG processing
          const result = await this.queryPipeline.respondToPrompt(
            userId,
            conversationId,
            prompt,
            conversationHistory,
            this.vectorStore,
            null // TODO: Pass proper repository descriptor when available
          );
          return result;
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error in respondToPrompt:`, error.message);
          return {
            success: false,
            response: "I encountered an issue while processing your request. Please try again shortly.",
            conversationId,
            timestamp: new Date().toISOString(),
            error: error.message
          };
        }
      });
    };

    if (this.enableTracing && traceable) {
      try {
        const traced = traceable(exec, {
          name: 'AIAdapter.respondToPrompt',
            project_name: process.env.LANGCHAIN_PROJECT || 'eventstorm-trace',
            metadata: { userId, conversationId },
            tags: ['rag', 'adapter', 'query']
        });
        return traced();
      } catch (traceErr) {
        console.warn(`[${new Date().toISOString()}] [TRACE] Failed to trace respondToPrompt: ${traceErr.message}`);
      }
    }
    return exec();
  }

  /**
   * Perform text search using PostgreSQL
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Array} Text search results
   */
  async searchText(query, options = {}) {
    if (!this.textSearchService) {
      throw new Error('Text search service not initialized. Call initializeTextSearch() first.');
    }

    try {
      console.log(`[${new Date().toISOString()}] 🔍 Performing text search: "${query}"`);
      
      const results = await this.textSearchService.searchDocuments(query, {
        userId: this.userId,
        ...options
      });
      
      console.log(`[${new Date().toISOString()}] 📄 Text search found ${results.length} results`);
      return results;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Text search failed:`, error.message);
      throw error;
    }
  }

  /**
   * Perform hybrid search combining vector and text search
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Array} Combined search results
   */
  async searchHybrid(query, options = {}) {
    if (!this.hybridSearchService) {
      throw new Error('Hybrid search service not initialized. Call initializeTextSearch() first.');
    }

    try {
      console.log(`[${new Date().toISOString()}] 🔄 Performing hybrid search: "${query}"`);
      
      // Add user's namespace for vector search
      const searchOptions = {
        userId: this.userId,
        namespace: this.vectorStore?.namespace,
        ...options
      };

      const results = await this.hybridSearchService.search(query, searchOptions);
      
      console.log(`[${new Date().toISOString()}] 🎯 Hybrid search found ${results.length} results`);
      return results;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Hybrid search failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get search capabilities and statistics
   * @returns {object} Information about available search capabilities
   */
  async getSearchCapabilities() {
    const capabilities = {
      vectorSearch: {
        available: !!this.vectorSearchOrchestrator,
        connected: this.vectorSearchOrchestrator?.isConnected() || false
      },
      textSearch: {
        available: !!this.textSearchService,
        connected: false
      },
      hybridSearch: {
        available: !!this.hybridSearchService
      }
    };

    // Check text search connectivity
    if (this.textSearchService) {
      try {
        capabilities.textSearch.connected = await this.textSearchService.isAvailable();
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] Could not check text search availability:`, error.message);
      }
    }

    // Get detailed capabilities from hybrid service if available
    if (this.hybridSearchService) {
      try {
        const detailedCapabilities = await this.hybridSearchService.getSearchCapabilities(this.userId);
        capabilities.detailed = detailedCapabilities;
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] Could not get detailed search capabilities:`, error.message);
      }
    }

    return capabilities;
  }

  /**
   * Test search functionality
   * @param {string} testQuery - Query to test with
   * @returns {object} Test results from all search systems
   */
  async testSearchSystems(testQuery = 'function') {
    const results = {
      vectorSearch: { available: false, success: false, results: [], error: null },
      textSearch: { available: false, success: false, results: [], error: null },
      hybridSearch: { available: false, success: false, results: [], error: null }
    };

    // Test vector search
    if (this.vectorSearchOrchestrator) {
      results.vectorSearch.available = true;
      try {
        const vectorResults = await this.vectorSearchOrchestrator.searchSimilar(testQuery, {
          namespace: this.vectorStore?.namespace,
          topK: 3,
          threshold: 0.3
        });
        results.vectorSearch.success = true;
        results.vectorSearch.results = vectorResults;
      } catch (error) {
        results.vectorSearch.error = error.message;
      }
    }

    // Test text search
    if (this.textSearchService) {
      results.textSearch.available = true;
      try {
        const textResults = await this.textSearchService.searchDocumentsSimple(testQuery, { 
          userId: this.userId, 
          limit: 3 
        });
        results.textSearch.success = true;
        results.textSearch.results = textResults;
      } catch (error) {
        results.textSearch.error = error.message;
      }
    }

    // Test hybrid search
    if (this.hybridSearchService) {
      results.hybridSearch.available = true;
      try {
        const hybridResults = await this.hybridSearchService.testSearchSystems(testQuery);
        results.hybridSearch.success = true;
        results.hybridSearch.results = hybridResults;
      } catch (error) {
        results.hybridSearch.error = error.message;
      }
    }

    return results;
  }

  /**
   * Emit RAG status events for monitoring
   */
  emitRagStatus(status, details = {}) {
    // Always log the status update
    console.log(`[${new Date().toISOString()}] 🔍 RAG STATUS: ${status}`, 
      Object.keys(details).length > 0 ? JSON.stringify(details, null, 2) : '');
    
    // Try to emit to the event bus if available
    try {
      const payload = {
        component: 'aiLangchainAdapter',
        phase: status,
        metrics: details,
        ts: new Date().toISOString()
      };

      // First try the instance event bus
      if (this.eventBus) {
        this.eventBus.emit('rag.status', payload);
        return;
      }
      
      // Fallback to imported event bus if instance one isn't available
      const eventDispatcherPath = '../../../../eventDispatcher';
      const { eventBus } = require(eventDispatcherPath);
      if (eventBus) {
        eventBus.emit('rag.status', payload);
      }
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Failed to emit RAG status update: ${error.message}`);
    }
  }

  /**
   * Manually trigger system documentation processing
   * Useful for refreshing documentation or debugging
   */
  // (No manual system documentation startup here; the DocsProcessor can be invoked where appropriate.)
}

module.exports = AILangchainAdapter;
```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.435316086,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:9ca198d32100df07"
}
```

---

### Chunk 12/29
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 1113 characters
- **Score**: 0.409988403
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
// aiResponse.js
/* eslint-disable no-unused-vars */

'use strict';

const AiResponseGeneratedEvent = require('../events/aiResponseGeneratedEvent');
const UserId = require('../value_objects/userId');
const Prompt = require('../value_objects/prompt');

class AIResponse {
  constructor(userId) {
    if (!(userId instanceof UserId)) throw new Error('userId must be a UserId value object');
    this.userId = userId;
  }

  async respondToPrompt(userId, conversationId, prompt, IAIPort, conversationHistory = []) {
    if (!(userId instanceof UserId)) throw new Error('userId must be a UserId value object');
    if (!(prompt instanceof Prompt)) throw new Error('prompt must be a Prompt value object');
    const response = await IAIPort.respondToPrompt(userId.value, conversationId, prompt.text, conversationHistory);
    console.log(`AI Response received: ${response}`);
    // Emit domain event
    const event = new AiResponseGeneratedEvent({
      userId: userId.value,
      conversationId,
      prompt: prompt.text,
      response
    });
    return { response, event };
  }
}

module.exports = AIResponse;

```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.409988403,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:d5ea7b9b00722854"
}
```

---

### Chunk 13/29
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 954 characters
- **Score**: 0.392627746
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
/* eslint-disable no-unused-vars */

/**
 * IUserService - ABSTRACT INTERFACE (NOT IMPLEMENTED)
 * 
 * This is an abstract base class that defines the contract for user services.
 * DO NOT USE THIS FILE TO CHECK FOR IMPLEMENTATIONS.
 * 
 * For actual implementations, see:
 * - UserService class in: backend/aop_modules/auth/application/services/userService.js
 * 
 * All methods below throw errors and are NOT implemented here.
 */
class IUserService {
  constructor() {
    if (new.target === IUserService) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async readAllUsers() {
    throw new Error('Method not implemented.');
  }

  async getUserInfo() {
    throw new Error('Method not implemented.');
  }

  async register(username, email, password) {
    throw new Error('Method not implemented.');
  }

  async removeUser(email) {
    throw new Error('Method not implemented.');
  }
}

module.exports = IUserService;

```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.392627746,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:3e4a78a9ee92da67"
}
```

---

### Chunk 14/29
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 521 characters
- **Score**: 0.386184692
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
'use strict';
/* eslint-disable no-unused-vars */

class IGitService {
  constructor() {
    if (new.target === IGitService) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async fetchRepo(userId, repoId) {
    throw new Error('Method not implemented.');
  }

  async fetchDocs(userId, repoId) {
    throw new Error('Method not implemented.');
  }

  async persistRepo(userId, repoId, branch, options) {
    throw new Error('Method not implemented.');
  }

}

module.exports = IGitService;

```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.386184692,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:8cce9c9179821b52"
}
```

---

### Chunk 15/29
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 10406 characters
- **Score**: 0.372413665
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
// app.js
'use strict';
/* eslint-disable no-unused-vars */

const BUILDING_API_SPEC = process.env.GENERATING_HTTP_API_SPEC === '1';

const path              = require('node:path');
const AutoLoad          = require('@fastify/autoload');
const fastifySensible   = require('@fastify/sensible');
const fastifyCookie     = require('@fastify/cookie');
const fastifySession    = require('@fastify/session');
const RedisStore        = require('./redisStore');
const redisPlugin       = require('./redisPlugin');
const websocketPlugin   = require('./websocketPlugin');
const loggingPlugin     = require('./logPlugin');
const schemaLoaderPlugin = require('./env_schemas/schemaLoaderPlugin');
const envPlugin         = require('./envPlugin');
const diPlugin          = require('./diPlugin');
const corsPlugin        = require('./corsPlugin');
const helmet            = require('@fastify/helmet');
const pubsubPlugin      = require('./pubsubPlugin');
const eventDispatcher   = require('./eventDispatcher');

require('dotenv').config();

module.exports = async function (fastify, opts) {

  fastify.addHook('onRoute', (routeOptions) => {
    fastify.log.info({ method: routeOptions.method, url: routeOptions.url }, 'route registered');
  });

  await fastify.register(loggingPlugin);
  await fastify.register(schemaLoaderPlugin);
  await fastify.register(envPlugin);
  await fastify.register(diPlugin);
  await fastify.register(websocketPlugin);
  await fastify.register(fastifySensible);

  await fastify.register(require('@fastify/multipart'), {
    // Allow files up to 10MB (for voice recordings)
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB
    }
  });
  
  await fastify.register(eventDispatcher);
  
  if (!BUILDING_API_SPEC) {
    await fastify.register(pubsubPlugin);
  }
  
  // Sets security-related HTTP headers automatically
  await fastify.register(helmet, {
  global: true,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://accounts.google.com/gsi/client"],
      styleSrc: ["'self'", "'unsafe-inline'"], // keep inline for Swagger and GSI
      imgSrc: ["'self'", "https:", "data:", "blob:"],
      frameSrc: ["'self'", "https://accounts.google.com/gsi/"],
      connectSrc: [
        "'self'",
        "https://accounts.google.com/gsi/",
        ...(process.env.NODE_ENV !== 'production'
          ? ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "ws://localhost:*"]
          : ["https:", "wss:"])
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: []
    }
  }
});

  await fastify.register(corsPlugin);
  await fastify.register(require('./swaggerPlugin'));

  if (!BUILDING_API_SPEC) {
    await fastify.register(redisPlugin);
    fastify.redis.on('error', (err) => {
      fastify.log.error({ err }, 'Redis client error');
    });
    fastify.log.info('⏳ Testing Redis connection with PING…');
    try {
      const pong = await fastify.redis.ping();
      fastify.log.info(`✅ Redis PING response: ${pong}`);
    } catch (err) {
      fastify.log.error({ err }, '❌ Redis PING failed');
    }
  }

  if (!BUILDING_API_SPEC) {
    await fastify.register(
      fastifyCookie,
      {
        secret: fastify.secrets.COOKIE_SECRET,
        parseOptions: { 
          secure: true, // Only send cookies over HTTPS.
          httpOnly: true, // Prevents client-side JavaScript from accessing the cookie. Helps mitigate XSS (Cross-Site Scripting) attacks.
          sameSite: 'None' }, // Allows cross-site cookies (e.g., for third-party integrations). Must be used with secure: true (required by modern browsers).
      },
      { encapsulate: false }
    );
  }

  if (!BUILDING_API_SPEC) {
    await fastify.register(fastifySession, {
    secret: fastify.secrets.SESSION_SECRET,
    cookie: { secure: true, maxAge: 86400000, httpOnly: true, sameSite: 'None' },
    store: new RedisStore(fastify.redis.sendCommand.bind(fastify.redis)), // where session data is stored.
    saveUninitialized: false, // Do not create session until something stored in session.
  });
  }

  // ────────────────────────────────────────────────────────────────
  // HEALTH ROUTE
  // ────────────────────────────────────────────────────────────────
  fastify.get('/', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          },
          required: ['status', 'timestamp'],
          additionalProperties: false
        }
      }
    }
  }, async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Dedicateddd health check endpoint
  fastify.get('/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            version: { type: 'string' }
          },
          required: ['status', 'timestamp'],
          additionalProperties: false
        }
      }
    }
  }, async () => ({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  }));

  // ────────────────────────────────────────────────────────────────
  // AUTOLOAD MODULES
  // ────────────────────────────────────────────────────────────────
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'aop_modules'),
    encapsulate: false,
    maxDepth: 1,
    dirNameRoutePrefix: false,
    prefix: '/api',
    options: { ...opts},
  });

  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'business_modules'),
    encapsulate: true,
    maxDepth: 1,
    dirNameRoutePrefix: false,
    prefix: '/api',
    options: { ...opts},
  });

  fastify.get('/api/debug/swagger-routes', async (request, reply) => {
  try {
    const spec = fastify.swagger();
    return {
      hasSwagger: typeof fastify.swagger === 'function',
      specKeys: Object.keys(spec),
      pathsCount: spec.paths ? Object.keys(spec.paths).length : 0,
      paths: spec.paths ? Object.keys(spec.paths) : [],
      info: spec.info || null,
      openapi: spec.openapi || null
    };
  } catch (error) {
    return {
      error: error.message,
      hasSwagger: typeof fastify.swagger === 'function'
    };
  }
  });

  // Debug route
  fastify.route({
    method: 'GET',
    url: '/api/debug/clear-state-cookie',
    handler: (req, reply) => {
      reply.clearCookie('oauth2-redirect-state', { path: '/' });
      reply.send({ message: 'cleared' });
    },
    schema: {
      $id: 'schema:debug:clear-state-cookie',
      response: {
        200: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Confirmation message that the state cookie was cleared.'
            }
          },
          additionalProperties: false
        }
      }
    }
  });

  // Debug route to clear auth cookies
  fastify.route({
    method: 'GET',
    url: '/api/debug/clear-auth-cookie',
    handler: (req, reply) => {
      reply.clearCookie('authToken', { path: '/' });
      reply.send({ message: 'Auth cookie cleared successfully' });
    },
    schema: {
      $id: 'schema:debug:clear-auth-cookie',
      response: {
        200: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Confirmation message that the auth cookie was cleared.'
            }
          },
          additionalProperties: false
        }
      }
    }
  });

  fastify.get('/api/debug/schemas', {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          schemas: {
            type: 'object',
            additionalProperties: true
          },
          routes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                method: { type: 'string' },
                url: { type: 'string' },
                schema: {
                  type: 'object',
                  properties: {
                    exists: { type: 'boolean' },
                    hasType: { type: 'boolean' },
                    id: { type: 'string' }
                  },
                  additionalProperties: true
                }
              },
              required: ['method', 'url', 'schema'],
              additionalProperties: false
            }
          }
        },
        required: ['schemas', 'routes'],
        additionalProperties: false
      }
    }
  }
}    
  ,async (request, reply) => {
  const schemas = fastify._schemas;
  const routes = fastify.routes.map(route => ({
    method: route.method,
    url: route.url,
    schema: route.schema ? { 
      exists: true, 
      hasType: route.schema.type !== undefined,
      id: route.schema.$id
    } : { exists: false }
  }));
  
    return { schemas, routes };
  });

  // LangSmith tracing diagnostics endpoint
  fastify.get('/api/debug/tracing-status', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            langsmithTracing: { type: 'boolean' },
            langsmithApiKeySet: { type: 'boolean' },
            langsmithWorkspaceIdSet: { type: 'boolean' },
            langchainProject: { type: 'string' },
            langsmithOrganizationName: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          },
          required: ['langsmithTracing', 'langsmithApiKeySet', 'timestamp'],
          additionalProperties: false
        }
      }
    }
  }, async () => ({
    langsmithTracing: process.env.LANGSMITH_TRACING === 'true',
    langsmithApiKeySet: !!process.env.LANGSMITH_API_KEY,
    langsmithWorkspaceIdSet: !!process.env.LANGSMITH_WORKSPACE_ID,
    langchainProject: process.env.LANGCHAIN_PROJECT || 'eventstorm-trace',
    langsmithOrganizationName: process.env.LANGSMITH_ORGANIZATION_NAME || 'not-set',
    timestamp: new Date().toISOString()
  }));

  await fastify.register(require('./swaggerUI'));

  fastify.addHook('onReady', async () => {

    fastify.log.info('▶ Registered routes:\n' + fastify.printRoutes());
  });
};

```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.372413665,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:76ac57a41178be0a"
}
```

---

### Chunk 16/29
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 409 characters
- **Score**: 0.361364365
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
// IAIPersistPort.js
/* eslint-disable no-unused-vars */
'use strict';

class IAIPersistPort {
  constructor() {
    if (new.target === IAIPersistPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async saveAiResponse() { throw new Error('Method not implemented.'); }
  async saveRepoPush() { throw new Error('Method not implemented.'); }
}

module.exports = IAIPersistPort;

```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.361364365,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:43e1ec874b06fba9"
}
```

---

### Chunk 17/29
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 4079 characters
- **Score**: 0.355762511
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
// userService.js
/* eslint-disable no-unused-vars */
'use strict';
const User = require('../../domain/entities/user');
const IUserService = require('./interfaces/IUserService');

/**
 * UserService - CONCRETE IMPLEMENTATION of IUserService interface
 * 
 * This class implements all authentication-related business logic.
 * All methods below are FULLY IMPLEMENTED (not abstract).
 * 
 * Implemented Methods:
 * - loginWithGoogle(accessToken): OAuth2 Google authentication
 * - readAllUsers(): Retrieves all users from persistence layer
 * - registerUser(username, email, password): Creates new user account
 * - removeUser(email): Deletes user by email
 * - getUserInfo(email): Fetches user details by email
 */
class UserService extends IUserService {
  constructor({authPersistAdapter}) {
    super(); 
    this.User = User;
    this.authPersistAdapter = authPersistAdapter;
  }

  async loginWithGoogle(accessToken) {
    try {
      // 1) Fetch user info from Google using the access token
      //    The "alt=json" ensures JSON response
      const url = `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${accessToken}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Google userinfo request failed:', await response.text());
        return null; // Return null to indicate verification failure
      }

      const googleProfile = await response.json();
      // googleProfile might contain { email, verified_email, name, picture, ... }

      // 2) Basic checks
      if (!googleProfile.email) {
        console.error('No email found in Google profile:', googleProfile);
        return null;
      }
      // Optionally check verified_email if present
      // if (googleProfile.verified_email === false) return null;

      // 3) See if we already have a user with this email
      let user = await this.getUserInfo(googleProfile.email);
      if (!user) {
        // Create a new user
        const username = googleProfile.name || googleProfile.email.split('@')[0];
        user = await this.registerUser(username, googleProfile.email, 'placeholder-google-pass');
      }

      // 4) Return user object, optionally add user.picture from googleProfile
      //    If your DB model has a "picture" field, you might store it there
      return {
        ...user,
        picture: googleProfile.picture,
      };
    } catch (error) {
      console.error('Error in loginWithGoogle:', error);
      return null; 
    }
  }
  
  async readAllUsers() {
    try {
      const users = await this.authPersistAdapter.readAllUsers();
      console.log('Users retrieved successfully:', users);
      return users;
    } catch (error) {
      console.error('Error retrieving users:', error);
      throw error;
    }
  }

  async registerUser(username, email, password) {
    try {
      const userInstance = new this.User();
      const newUser = await userInstance.registerUser(username, email, password, this.authPersistAdapter);
      console.log('User registered successfully:', newUser);
      return newUser;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  async removeUser(email) {
    try {
      const userInstance = new this.User();
      console.log('userInstance instantiated at userService removeUser method: ', userInstance);
      await userInstance.removeUser(email, this.authPersistAdapter);
      console.log('User removed successfully');
    } catch (error) {
      console.error('Error removing user:', error);
      throw error;
    }
  }

  async getUserInfo(email) {
    try {
      const userInstance = new this.User();
      const userData = await userInstance.getUserInfo(email, this.authPersistAdapter);
      console.log('User retrieved successfully:', userData);
      return userData;
    } catch (error) {
      console.error('Error reading user:', error);
      throw error;
    }
  }
}

module.exports = UserService;

```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.355762511,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:b6a272f88a31a774"
}
```

---

### Chunk 18/29
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 6837 characters
- **Score**: 0.355102539
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
// authRouter.js
'use strict';
const fp = require('fastify-plugin');

module.exports = fp(async function authRouter(fastify, opts) {

  console.log('authRouter is loaded!');
  // Temporarily commenting out debug logs to clean up output
  // console.log('fastify.verifyToken exists:', typeof fastify.verifyToken);
  // console.log('fastify decorations:', Object.getOwnPropertyNames(fastify).filter(name => !name.startsWith('_')));

  // GET /api/auth/disco
  fastify.route({
    method: 'GET',
    url: '/api/auth/disco',
    schema: {
      tags: ['auth'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            users: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  email: { type: 'string', format: 'email' },
                  username: { type: 'string' }
                },
                required: ['id', 'email', 'username'],
                additionalProperties: false
              }
            }
          },
          required: ['message', 'users'],
          additionalProperties: false
        }
      }
    },
    handler: fastify.readAllUsers,
  });

  // POST /api/auth/register
  fastify.route({
    method: 'POST',
    url: '/api/auth/register',
    schema: {
      tags: ['auth'],
      body: {
        type: 'object',
        properties: {
          username: { type: 'string', maxLength: 50 },
          email: { type: 'string', format: 'email', maxLength: 255 },
          password: { type: 'string', minLength: 8, maxLength: 100 }
        },
        required: ['username', 'email', 'password'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                username: { type: 'string' }
              },
              required: ['id', 'email', 'username'],
              additionalProperties: false
            }
          },
          required: ['message', 'user'],
          additionalProperties: false
        }
      }
    },
    handler: fastify.registerUser,
  });

  // DELETE /api/auth/remove
  fastify.route({
    method: 'DELETE',
    url: '/api/auth/remove',
    schema: {
      tags: ['auth'],
      querystring: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' }
        },
        additionalProperties: false
      },
      response: {
        204: {
          description: 'No Content'
        }
      }
    },
    handler: fastify.removeUser
  });

  // POST /api/auth/login
  fastify.route({
    method: 'POST',
    url: '/api/auth/login',
    schema: {
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                username: { type: 'string' }
              },
              required: ['id', 'email', 'username'],
              additionalProperties: false
            }
          },
          required: ['message', 'user'],
          additionalProperties: false
        }
      }
    },
    handler: fastify.loginUser,
  });

  // GET /api/auth/me
  fastify.route({
    method: 'GET',
    url: '/api/auth/me',
    schema: {
      tags: ['auth'],
      headers: {
        type: 'object',
        properties: {
          authorization: {
            type: 'string',
            pattern: '^Bearer [a-zA-Z0-9-._~+/]+=*$'
          }
        },
        additionalProperties: true
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string' }
          },
          required: ['id', 'username'],
          additionalProperties: false
        }
      }
    },
    preValidation: [fastify.verifyToken],
    handler: fastify.getUserInfo,
  });

  // POST /api/auth/logout
  fastify.route({
    method: 'POST',
    url: '/api/auth/logout',
    schema: {
      tags: ['auth'],
      response: {
        204: {
          description: 'No Content'
        }
     }
    },
    preValidation: [fastify.verifyToken],
    handler: fastify.logoutUser,
  });

  // POST /api/auth/refresh
  fastify.route({
    method: 'POST',
    url: '/api/auth/refresh',
    schema: {
      tags: ['auth'],
      headers: {
        type: 'object',
        properties: {
          authorization: {
            type: 'string',
            pattern: '^Bearer [a-zA-Z0-9-._~+/]+=*$'
          }
        },
        additionalProperties: true
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' }
          },
          required: ['token'],
          additionalProperties: false
        }
      }
    },
    preValidation: [fastify.verifyToken],
    handler: fastify.refreshToken,
  });

// Privacy Policy Route
fastify.route({
  method: 'GET',
  url: '/api/privacy',
  schema: {
    tags: ['auth'],
    response: {
      200: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'HTML content for the privacy policy page'
          }
        }
      }
    }
  },
  handler: async (request, reply) => {
    const htmlContent = `
      <h1>Privacy Policy</h1>
      <p>This page is under construction. We will publish our final policy soon.</p>
    `;
    reply.type('text/html').send(htmlContent);
  }
});

// Termss of Service Route
fastify.route({
  method: 'GET',
  url: '/api/terms',
  schema: {
    tags: ['auth'],
    response: {
      200: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'HTML content for the terms of service page'
          }
        }
      }
    }
  },
  handler: async (request, reply) => {
    const htmlContent = `
      <h1>Terms of Service</h1>
      <p>This page is under construction. We will publish our official terms soon.</p>
    `;
    reply.type('text/html').send(htmlContent);
  }
});

});
```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.355102539,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:c57b27add1d880c1"
}
```

---

### Chunk 19/29
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 6876 characters
- **Score**: 0.346769333
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
// gitService.js
'use strict';
/* eslint-disable no-unused-vars */

const Repository = require('../../domain/entities/repository');
const IGitService = require('./interfaces/IGitService');
const UserId = require('../../domain/value_objects/userId');
const RepoId = require('../../domain/value_objects/repoId');
const RepoFetchedEvent = require('../../domain/events/repoFetchedEvent');
const RepoPersistedEvent = require('../../domain/events/repoPersistedEvent');
const DocsFetchedEvent = require('../../domain/events/docsFetchedEvent');

class GitService extends IGitService {
  constructor({gitMessagingAdapter, gitAdapter, gitPersistAdapter}) {
    super();
    this.gitMessagingAdapter = gitMessagingAdapter;  
    this.gitAdapter = gitAdapter;
    this.gitPersistAdapter = gitPersistAdapter;  
  }

  async fetchRepo(userIdRaw, repoIdRaw, correlationId) {
    try {
      const userId = new UserId(userIdRaw);
      const repoId = new RepoId(repoIdRaw);
      console.log(`[GitService] Starting fetchRepo: userId=${userId}, repoId=${repoId}`);
      
      // Fetch repo from GitHub
      const repository = new Repository(userId);
      const repo = await repository.fetchRepo(repoId.value, this.gitAdapter);
      console.log(`[GitService] ✅ Repository fetched from GitHub successfully`);
      
      // Publish domain event
      const event = new RepoFetchedEvent({ userId: userId.value, repoId: repoId.value, repo });
      await this.gitMessagingAdapter.publishRepoFetchedEvent(event, correlationId);
      console.log(`[GitService] ✅ Event published to Pub/Sub successfully`);
      
      // Persist to database
      await this.gitPersistAdapter.persistRepo(userId.value, repoId.value, repo);
      console.log(`[GitService] ✅ Repository persisted to database successfully`);
      
      console.log(`[GitService] ✅ fetchRepo completed successfully`);
      return repo;
      
    } catch (error) {
      console.error(`[GitService] ❌ fetchRepo failed:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        userId: userIdRaw,
        repoId: repoIdRaw,
        correlationId,
        stack: error.stack
      });
      throw error;
    }
  }

  async fetchDocs(userIdRaw, repoIdRaw, correlationId) {
    try {
      const userId = new UserId(userIdRaw);
      const repoId = new RepoId(repoIdRaw);
      console.log(`[GitService] Starting fetchDocs: userId=${userId}, repoId=${repoId}`);
      
      const repository = new Repository(userId);
      const docsData = await repository.fetchDocs(repoId.value, this.gitAdapter);
      console.log(`[GitService] ✅ Docs fetched from GitHub successfully`);
      
      // Publish domain event
      const event = new DocsFetchedEvent({ userId: userId.value, repoId: repoId.value, docs: docsData });
      await this.gitMessagingAdapter.publishDocsFetchedEvent(event, correlationId);
      console.log(`[GitService] ✅ Docs event published to Pub/Sub successfully`);
      
      // Persist to database
      await this.gitPersistAdapter.persistDocs(userId.value, repoId.value, docsData);
      console.log(`[GitService] ✅ Docs persisted to database successfully`);
      
      console.log(`[GitService] ✅ fetchDocs completed successfully`);
      return docsData;
      
    } catch (error) {
      console.error(`[GitService] ❌ fetchDocs failed:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        userId: userIdRaw,
        repoId: repoIdRaw,
        correlationId,
        stack: error.stack
      });
      throw error;
    }
  }

  async persistRepo(userIdRaw, repoIdRaw, branch = 'main', options = {}) {
    try {
      const { forceUpdate = false, includeHistory = true, correlationId } = options;
      const userId = new UserId(userIdRaw);
      const repoId = new RepoId(repoIdRaw);
      console.log(`[GitService] Starting persistRepo: userId=${userId}, repoId=${repoId}, branch=${branch}, forceUpdate=${forceUpdate}`);
      
      // Create repository domain entity
      const repository = new Repository(userId);
      
      // Check if repository already exists (if not forcing update)
      if (!forceUpdate) {
        try {
          const existingRepo = await this.gitPersistAdapter.getRepo(userId.value, repoId.value);
          if (existingRepo) {
            console.log(`[GitService] ⚠️ Repository already exists and forceUpdate=false`);
            throw new Error(`Repository ${repoId.value} already exists for user ${userId.value}. Use forceUpdate=true to overwrite.`);
          }
        } catch (getError) {
          // If error is "not found", continue with persistence
          if (!getError.message.includes('not found') && !getError.message.includes('does not exist')) {
            throw getError;
          }
          console.log(`[GitService] Repository does not exist, proceeding with persistence`);
        }
      }
      
      // Fetch repository data from GitHub
      const repoData = await repository.fetchRepo(repoId.value, this.gitAdapter);
      console.log(`[GitService] ✅ Repository data fetched from GitHub successfully`);
      
      // Persist to database with additional metadata
      const persistResult = await this.gitPersistAdapter.persistRepo(
        userId.value, 
        repoId.value, 
        repoData, 
        { branch, includeHistory, persistedAt: new Date().toISOString() }
      );
      console.log(`[GitService] ✅ Repository persisted to database successfully`);
      
      // Create and publish domain event (you may want to create RepoPersistedEvent)
      const event = new RepoPersistedEvent({ 
        userId: userId.value, 
        repoId: repoId.value, 
        repo: repoData,
        action: 'persist',
        branch,
        forceUpdate,
        persistedAt: new Date().toISOString()
      });
      await this.gitMessagingAdapter.publishRepoPersistedEvent(event, correlationId);
      console.log(`[GitService] ✅ Persistence event published to Pub/Sub successfully`);
      
      const result = {
        success: true,
        repositoryId: repoId.value,
        owner: repoId.value.split('/')[0],
        repo: repoId.value.split('/')[1],
        branch,
        persistedAt: new Date().toISOString(),
        filesProcessed: repoData.files?.length || 0,
        message: forceUpdate ? 'Repository updated successfully' : 'Repository persisted successfully'
      };
      
      console.log(`[GitService] ✅ persistRepo completed successfully`);
      return result;
      
    } catch (error) {
      console.error(`[GitService] ❌ persistRepo failed:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        userId: userIdRaw,
        repoId: repoIdRaw,
        branch,
        options,
        stack: error.stack
      });
      throw error;
    }
  }
}

module.exports = GitService;
```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.346769333,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:4f16c127b1f4e5bd"
}
```

---

### Chunk 20/29
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 16993 characters
- **Score**: 0.346105576
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
// diPlugin.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');
const { fastifyAwilixPlugin } = require('@fastify/awilix');
const { asClass, asValue, Lifetime } = require('awilix');

const infraConfig = require('./infraConfig.json');

const UserService = require('./aop_modules/auth/application/services/userService');
const AuthPostgresAdapter = require('./aop_modules/auth/infrastructure/persistence/authPostgresAdapter');

const ChatService = require('./business_modules/chat/application/services/chatService');
const ChatPostgresAdapter = require('./business_modules/chat/infrastructure/persistence/chatPostgresAdapter');
const ChatPubsubAdapter = require('./business_modules/chat/infrastructure/messaging/pubsub/chatPubsubAdapter');
const ChatAiAdapter = require('./business_modules/chat/infrastructure/ai/chatAiAdapter');
const ChatGCPVoiceAdapter = require('./business_modules/chat/infrastructure/voice/chatGCPVoiceAdapter');

const GitService = require('./business_modules/git/application/services/gitService');
const GitPostgresAdapter = require('./business_modules/git/infrastructure/persistence/gitPostgresAdapter');
const GitGithubAdapter = require('./business_modules/git/infrastructure/git/gitGithubAdapter');
const GitPubsubAdapter = require('./business_modules/git/infrastructure/messaging/pubsub/gitPubsubAdapter');

const DocsService = require('./business_modules/docs/application/services/docsService');
const DocsPostgresAdapter = require('./business_modules/docs/infrastructure/persistence/docsPostgresAdapter');
const DocsPubsubAdapter = require('./business_modules/docs/infrastructure/messaging/pubsub/docsPubsubAdapter');
const DocsLangchainAdapter = require('./business_modules/docs/infrastructure/ai/docsLangchainAdapter');
const DocsGithubAdapter = require('./business_modules/docs/infrastructure/git/docsGithubAdapter');

const ApiService = require('./business_modules/api/application/services/apiService');
const ApiPostgresAdapter = require('./business_modules/api/infrastructure/persistence/apiPostgresAdapter');
const ApiPubsubAdapter = require('./business_modules/api/infrastructure/messaging/pubsub/apiPubsubAdapter');
const ApiSwaggerAdapter = require('./business_modules/api/infrastructure/api/apiSwaggerAdapter');

const AIService = require('./business_modules/ai/application/services/aiService');
const AIPostgresAdapter = require('./business_modules/ai/infrastructure/persistence/aiPostgresAdapter');
const AILangchainAdapter = require('./business_modules/ai/infrastructure/ai/aiLangchainAdapter');
const AIPubsubAdapter = require('./business_modules/ai/infrastructure/messaging/pubsub/aiPubsubAdapter');
const AIGithubAdapter = require('./business_modules/ai/infrastructure/git/aiGithubAdapter');
const AIGithubDocsAdapter = require('./business_modules/ai/infrastructure/docs/aiGithubDocsAdapter');

const { PubSub } = require('@google-cloud/pubsub');
const eventDispatcher = require('./eventDispatcher');
const { Connector } = require('@google-cloud/cloud-sql-connector');

module.exports = fp(async function (fastify, opts) {
  fastify.log.info('🔧 Starting DI plugin initialization...');
  
  try {
    fastify.log.info('📦 Registering fastifyAwilixPlugin...');
    await fastify.register(fastifyAwilixPlugin, {
      disposeOnClose: true, // dispose (clean up, release resources, close DB connections, etc.,) the Awilix DI container when the Fastify server is closed. 
      disposeOnResponse: true, // dispose the DI container after each response. prevents memory leaks by ensuring per-request dependencies are cleaned up after use.
      strictBooleanEnforced: true, // only a real boolean value (true/false) will be accepted,
      injectionMode: 'PROXY',
      // 'PROXY' mode uses JavaScript proxies to resolve dependencies lazily and automatically, allowing for easier property injection and circular dependency support.
      // 'CLASSIC' mode requires dependencies to be explicitly declared in constructor signatures constructors/functions (requires explicit argument lists, object destructuring is common)..
      encapsulate: false, // Awilix container - global across your Fastify app,
    });
    fastify.log.info('✅ fastifyAwilixPlugin registered successfully');
  } catch (error) {
    fastify.log.error(`❌ Failed to register fastifyAwilixPlugin: ${error.message}`); 
    fastify.log.error('Error stack:', error.stack);
    throw fastify.httpErrors.internalServerError(
      'Failed to register fastifyAwilixPlugin',
      { cause: error } 
    );
  }

  // Debug: Check if diContainer is available
  fastify.log.info('🔍 Checking diContainer availability...');
  if (!fastify.diContainer) {
    fastify.log.error('❌ diContainer is not available after plugin registration');
    throw new Error('diContainer is not available');
  }
  fastify.log.info('✅ diContainer is available');

  // // Debug: Log infraConfig structure
  // fastify.log.info('📋 InfraConfig structure:');
  // fastify.log.info('AOP modules:', JSON.stringify(infraConfig.aop_modules, null, 2));
  // fastify.log.info('Business modules:', JSON.stringify(infraConfig.business_modules, null, 2));

  // STEP 1: Register basic dependencies FIRST
  fastify.log.info('🔗 Initializing Cloud SQL Connector...');
  const cloudSqlConnector = new Connector(); 
  try {
    await fastify.diContainer.register({
      cloudSqlConnector: asValue(cloudSqlConnector)
    });
    fastify.log.info('✅ Cloud SQL Connector initialized and registered in DI container.');
  } catch (error) {
    fastify.log.error('❌ Failed to register Cloud SQL Connector:', error.message);
    throw error;
  }

  fastify.log.info('🔗 Initializing Pub/Sub Client...');
  const pubSubClient = new PubSub(); 
  try {
    await fastify.diContainer.register({
      pubSubClient: asValue(pubSubClient)
    });
    fastify.log.info('✅ Pub/Sub Client initialized and registered in DI container.');
  } catch (error) {
    fastify.log.error('❌ Failed to register Pub/Sub Client:', error.message);
    throw error;
  }

  try {
    // Debug the eventDispatcher before registration
    console.log('🔧 EventDispatcher before registration:', {
      hasEventDispatcher: !!fastify.eventDispatcher,
      eventDispatcherType: typeof fastify.eventDispatcher,
      eventDispatcherValue: fastify.eventDispatcher
    });

    await fastify.diContainer.register({
      eventDispatcher: asValue(eventDispatcher)
    });
       
    fastify.log.info('✅ EventDispatcher registered in DI container.');
  } catch (error) {
    fastify.log.error('❌ Failed to register EventDispatcher:', error.message);
    throw error;
  }

    //   // Debug after registration
    // const resolvedEventDispatcher = fastify.diContainer.resolve('eventDispatcher');
    // console.log('🔧 EventDispatcher after registration:', {
    //   hasResolved: !!resolvedEventDispatcher,
    //   resolvedType: typeof resolvedEventDispatcher,
    //   resolvedValue: resolvedEventDispatcher
    // });

  // STEP 2: NOW build adapters map AFTER dependencies are registered
  fastify.log.info('🏗️ Building adapters map...');
  const adapters = {
    authPostgresAdapter: asClass(AuthPostgresAdapter).singleton(),
    chatPostgresAdapter: asClass(ChatPostgresAdapter).scoped(),
    chatPubsubAdapter: asClass(ChatPubsubAdapter).scoped(),
    chatAiAdapter: asClass(ChatAiAdapter),
    chatGCPVoiceAdapter: asClass(ChatGCPVoiceAdapter).scoped(),
    apiSwaggerAdapter: asClass(ApiSwaggerAdapter).scoped(),
    apiPostgresAdapter: asClass(ApiPostgresAdapter).scoped(),
    apiPubsubAdapter: asClass(ApiPubsubAdapter).scoped(),
    gitGithubAdapter: asClass(GitGithubAdapter).scoped(),
    gitPubsubAdapter: asClass(GitPubsubAdapter).scoped(),
    gitPostgresAdapter: asClass(GitPostgresAdapter).scoped(),
    aiPostgresAdapter: asClass(AIPostgresAdapter).scoped(),
    aiLangchainAdapter: asClass(AILangchainAdapter, {
      injector: (container) => {
        const adapter = {
          aiProvider: container.resolve('aiProvider'),
          aiPersistAdapter: container.resolve('aiPersistAdapter'),
          maxRequestsPerMinute: 60,
          retryDelay: 5000,
          maxRetries: 10
        };
        return adapter;
      }
    }).scoped()
      .disposer((aiAdapter) => {
        // Cleanup on disposal
        if (aiAdapter && typeof aiAdapter.cleanup === 'function') {
          return aiAdapter.cleanup();
        }
      }),
    aiPubsubAdapter: asClass(AIPubsubAdapter).scoped(),
    aiGithubAdapter: asClass(AIGithubAdapter).scoped(),
    aiGithubDocsAdapter: asClass(AIGithubDocsAdapter).scoped(),
    docsPubsubAdapter: asClass(DocsPubsubAdapter).scoped(),
    docsPostgresAdapter: asClass(DocsPostgresAdapter).scoped(),
    docsLangchainAdapter: asClass(DocsLangchainAdapter).scoped(),
    docsGithubAdapter: asClass(DocsGithubAdapter).scoped(),
  };

  // Debug: Validate adapters
  // fastify.log.info('🔍 Validating adapters...');
  // Object.entries(adapters).forEach(([key, adapter]) => {
  //   if (!adapter) {
  //     fastify.log.error(`❌ Adapter '${key}' is undefined`);
  //   } else {
  //     fastify.log.debug(`✅ Adapter '${key}' is valid:`, {
  //       name: adapter.name,
  //       lifetime: adapter.lifetime,
  //       type: typeof adapter
  //     });
  //   }
  // });

  // Debug: Log adapter keys
  // fastify.log.info('Available adapter keys:', Object.keys(adapters));

  // Debug: Validate config-based adapter mappings
  fastify.log.info('🔍 Validating config-based adapter mappings...');
  
  const configMappings = [
    { key: 'authPersistAdapter', config: infraConfig.aop_modules.auth.authPersistAdapter },
    { key: 'docsMessagingAdapter', config: infraConfig.business_modules.docs.docsMessagingAdapter },
    { key: 'docsPersistAdapter', config: infraConfig.business_modules.docs.docsPersistAdapter },
    { key: 'docsAiAdapter', config: infraConfig.business_modules.docs.docsAiAdapter },
    { key: 'docsGitAdapter', config: infraConfig.business_modules.docs.docsGitAdapter },
    { key: 'chatPersistAdapter', config: infraConfig.business_modules.chat.chatPersistAdapter },
    { key: 'chatMessagingAdapter', config: infraConfig.business_modules.chat.chatMessagingAdapter },
    { key: 'chatAiAdapter', config: infraConfig.business_modules.chat.chatAiAdapter || infraConfig.business_modules.chat.chatAIAdapter },
    { key: 'chatVoiceAdapter', config: infraConfig.business_modules.chat.chatVoiceAdapter },
    { key: 'gitPersistAdapter', config: infraConfig.business_modules.git.gitPersistAdapter },
    { key: 'gitAdapter', config: infraConfig.business_modules.git.gitAdapter },
    { key: 'gitMessagingAdapter', config: infraConfig.business_modules.git.gitMessagingAdapter },
    { key: 'aiAdapter', config: infraConfig.business_modules.ai.aiAdapter },
    { key: 'aiPersistAdapter', config: infraConfig.business_modules.ai.aiPersistAdapter },
    { key: 'aiMessagingAdapter', config: infraConfig.business_modules.ai.aiMessagingAdapter },
    { key: 'aiGitAdapter', config: infraConfig.business_modules.ai.aiGitAdapter },
    { key: 'aiDocsAdapter', config: infraConfig.business_modules.ai.aiDocsAdapter },
    { key: 'apiPersistAdapter', config: infraConfig.business_modules.api.apiPersistAdapter },
    { key: 'apiMessagingAdapter', config: infraConfig.business_modules.api.apiMessagingAdapter },
    { key: 'apiAdapter', config: infraConfig.business_modules.api.apiAdapter }
  ];

  configMappings.forEach(({ key, config }) => {
    if (!config) {
      fastify.log.error(`❌ Config mapping '${key}' has undefined config value`);
    } else if (!adapters[config]) {
      fastify.log.error(`❌ Config mapping '${key}' -> '${config}' not found in adapters`);
      fastify.log.error(`Available adapters: ${Object.keys(adapters).join(', ')}`);
    } else {
      fastify.log.debug(`✅ Config mapping '${key}' -> '${config}' is valid`);
    }
  });

  // STEP 3: Build service registrations
  // fastify.log.info('📦 Building service registrations...');
  
  // Build the registration object step by step for better debugging
  const serviceRegistrations = {

    // Services
    chatService: asClass(ChatService, { lifetime: Lifetime.scoped }),
    gitService: asClass(GitService, { lifetime: Lifetime.scoped }),
    docsService: asClass(DocsService, { lifetime: Lifetime.scoped }),
    aiService: asClass(AIService, { lifetime: Lifetime.scoped }),
    apiService: asClass(ApiService, { lifetime: Lifetime.scoped }),
    userService: asClass(UserService, { lifetime: Lifetime.SINGLETON }),
    
    // Add aiProvider from infraConfig
    aiProvider: asValue(infraConfig.business_modules.ai.aiProvider || 'anthropic'),
  };

  // Add config-based adapters
  try {
    serviceRegistrations.authPersistAdapter = adapters[infraConfig.aop_modules.auth.authPersistAdapter];
    serviceRegistrations.docsMessagingAdapter = adapters[infraConfig.business_modules.docs.docsMessagingAdapter];
    serviceRegistrations.docsPersistAdapter = adapters[infraConfig.business_modules.docs.docsPersistAdapter];
    serviceRegistrations.docsAiAdapter = adapters[infraConfig.business_modules.docs.docsAiAdapter];
    serviceRegistrations.chatPersistAdapter = adapters[infraConfig.business_modules.chat.chatPersistAdapter];
    serviceRegistrations.chatMessagingAdapter = adapters[infraConfig.business_modules.chat.chatMessagingAdapter];
    serviceRegistrations.chatAiAdapter = adapters[infraConfig.business_modules.chat.chatAiAdapter || infraConfig.business_modules.chat.chatAIAdapter];
    serviceRegistrations.chatVoiceAdapter = adapters[infraConfig.business_modules.chat.chatVoiceAdapter];
    serviceRegistrations.gitPersistAdapter = adapters[infraConfig.business_modules.git.gitPersistAdapter];
    serviceRegistrations.gitAdapter = adapters[infraConfig.business_modules.git.gitAdapter];
    serviceRegistrations.docsGitAdapter = adapters[infraConfig.business_modules.git.gitAdapter];
    serviceRegistrations.gitMessagingAdapter = adapters[infraConfig.business_modules.git.gitMessagingAdapter];
    serviceRegistrations.aiAdapter = adapters[infraConfig.business_modules.ai.aiAdapter];
    serviceRegistrations.aiPersistAdapter = adapters[infraConfig.business_modules.ai.aiPersistAdapter];
    serviceRegistrations.aiMessagingAdapter = adapters[infraConfig.business_modules.ai.aiMessagingAdapter];
    serviceRegistrations.aiGitAdapter = adapters[infraConfig.business_modules.ai.aiGitAdapter];
    serviceRegistrations.aiDocsAdapter = adapters[infraConfig.business_modules.ai.aiDocsAdapter];
    serviceRegistrations.apiPersistAdapter = adapters[infraConfig.business_modules.api.apiPersistAdapter];
    serviceRegistrations.apiMessagingAdapter = adapters[infraConfig.business_modules.api.apiMessagingAdapter];
    serviceRegistrations.apiAdapter = adapters[infraConfig.business_modules.api.apiAdapter];
  } catch (error) {
    fastify.log.error('❌ Error building service registrations:', error.message);
    throw error;
  }

  // Debug: Validate all service registrations
  fastify.log.info('🔍 Validating service registrations...');
  const invalidRegistrations = [];
  
  Object.entries(serviceRegistrations).forEach(([key, registration]) => {
    if (!registration || registration === undefined) {
      invalidRegistrations.push(key);
      fastify.log.error(`❌ Service registration '${key}' is undefined`);
    } else {
      fastify.log.debug(`✅ Service registration '${key}' is valid:`, {
        name: registration.name,
        lifetime: registration.lifetime,
        type: typeof registration
      });
    }
  });

  if (invalidRegistrations.length > 0) {
    fastify.log.error(`❌ Found ${invalidRegistrations.length} invalid registrations:`, invalidRegistrations);
    throw new Error(`Invalid service registrations: ${invalidRegistrations.join(', ')}`);
  }

  fastify.log.info(`📦 Registering ${Object.keys(serviceRegistrations).length} services...`);
  
  try {
    // Debug: Log container state before registration
    fastify.log.debug('Container state before registration:', {
      hasRegistrations: !!fastify.diContainer.registrations,
      registrationCount: Object.keys(fastify.diContainer.registrations || {}).length
    });

    await fastify.diContainer.register(serviceRegistrations);
    
    fastify.log.info('✅ All services registered successfully');
    
    // Debug: Log container state after registration
    fastify.log.debug('Container state after registration:', {
      registrationCount: Object.keys(fastify.diContainer.registrations || {}).length,
      registeredServices: Object.keys(fastify.diContainer.registrations || {})
    });
    
  } catch (error) {
    fastify.log.error('❌ Failed to register services:', error.message);
    fastify.log.error('Error stack:', error.stack);
    throw error;
  }

  fastify.log.info('🎉 DI plugin initialization completed successfully');
}, {
  encapsulate: false,  // 🔧 CRITICAL: Make DI container globally accessible
  name: 'diPlugin'     // 🔧 Give it a name for dependency tracking
});
```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.346105576,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:403f3717e6cfe043"
}
```

---

### Chunk 21/29
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 483 characters
- **Score**: 0.341274261
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
// IAIPort.js
/* eslint-disable no-unused-vars */
'use strict';

class IAIPort {
  constructor() {
    if (new.target === IAIPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async processPushedRepo(userId, repoId, repoData) {
    throw new Error('Method not implemented.');
  }  

  async respondToPrompt(userId, conversationId, prompt, conversationHistory = []) {
    throw new Error('Method not implemented.');
  }

}

module.exports = IAIPort;

```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.341274261,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:125ce3a4ad048517"
}
```

---

### Chunk 22/29
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 1185 characters
- **Score**: 0.332317352
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
/* eslint-disable no-unused-vars */
'strict'
// IAuthPersistPort.js
class IAuthPersistPort {
    constructor() {
      if (new.target === IAuthPersistPort) {
        throw new Error("Cannot instantiate an abstract class.");
      }
    }

    async readAllUsers() {
      throw new Error("Method 'readAllUsers()' must be implemented.");
    }

    async getUserInfo(email) {
      throw new Error("Method 'getUserInfo(userId)' must be implemented.");    
    } 
     
    async registerUser(username, email, password) {
      throw new Error("Method 'registerUser(username, email, password)' must be implemented.");
    }
   
    async removeUser(email) {
      throw new Error("Method 'removeUser(username, password)' must be implemented.");
    }
  
    async findUserByUsername(username) {
      throw new Error("Method 'findUserByUsername(username)' must be implemented.");
    }
  
    async loginUser(email, password) {
      throw new Error("Method 'loginUser(username, password)' must be implemented.");
    }
  
    async logoutUser(sessionId) {
      throw new Error("Method 'logoutUser(sessionId)' must be implemented.");
    }
  }
  
  module.exports = IAuthPersistPort;
  
```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.332317352,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:466416a32abaaf46"
}
```

---

### Chunk 23/29
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 4529 characters
- **Score**: 0.325561523
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
/**
 * Manages different LLM providers (OpenAI, Anthropic, Google, Ollama)
 */
class LLMProviderManager {
  constructor(provider = 'openai', options = {}) {
    this.provider = provider.toLowerCase();
    this.maxRetries = options.maxRetries || 10;
    this.llm = null;
    this.initializeLLM();
  }

  /**
   * Initialize LLM based on provider
   */
  initializeLLM() {
    try {
      switch (this.provider) {
        case 'openai': {
          console.log(`[${new Date().toISOString()}] Initializing OpenAI provider`);
          // Import here to avoid requiring if not using this provider
          const { ChatOpenAI } = require('@langchain/openai');
          this.llm = new ChatOpenAI({
            modelName: 'gpt-3.5-turbo',
            temperature: 0,
            apiKey: process.env.OPENAI_API_KEY,
            maxRetries: this.maxRetries,
            maxConcurrency: 2
          });
          break;
        }

        case 'anthropic': {
          console.log(`[${new Date().toISOString()}] Initializing Anthropic provider`);
          // Import here to avoid requiring if not using this provider
          const { ChatAnthropic } = require('@langchain/anthropic');
          this.llm = new ChatAnthropic({
            modelName: 'claude-3-haiku-20240307',
            temperature: 0,
            apiKey: process.env.ANTHROPIC_API_KEY,
            maxRetries: this.maxRetries,
            maxConcurrency: 1, // Reduced to 1 to avoid rate limiting
            streaming: false, // Disable streaming to reduce connection overhead
            timeout: 120000 // 2 minute timeout
          });
          break;
        }

        case 'google': {
          console.log(`[${new Date().toISOString()}] Initializing Google provider`);
          // Import here to avoid requiring if not using this provider
          const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
          this.llm = new ChatGoogleGenerativeAI({
            modelName: 'gemini-pro',
            apiKey: process.env.GOOGLE_API_KEY,
            maxRetries: this.maxRetries,
            maxConcurrency: 2
          });
          break;
        }

        case 'ollama': {
          console.log(`[${new Date().toISOString()}] Initializing Ollama provider`);
          // Import here to avoid requiring if not using this provider
          // Some versions expose ChatOllama under @langchain/ollama, others under @langchain/community/chat_models/ollama
          let ChatOllama;
          try {
            ({ ChatOllama } = require('@langchain/community/chat_models/ollama'));
          } catch (e) {
            try {
              ({ ChatOllama } = require('@langchain/ollama'));
            } catch (inner) {
              throw new Error('ChatOllama module not found in either @langchain/community or @langchain/ollama');
            }
          }
          this.llm = new ChatOllama({
            model: process.env.OLLAMA_MODEL || 'llama3',
            baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
            maxRetries: this.maxRetries
          });
          break;
        }

        default: {
          console.warn(`[${new Date().toISOString()}] Unknown provider: ${this.provider}, falling back to OpenAI`);
          const { ChatOpenAI: DefaultChatOpenAI } = require('@langchain/openai');
          this.llm = new DefaultChatOpenAI({
            modelName: 'gpt-3.5-turbo',
            temperature: 0,
            apiKey: process.env.OPENAI_API_KEY,
            maxRetries: this.maxRetries,
            maxConcurrency: 2
          });
        }
      }

      console.log(`[${new Date().toISOString()}] Successfully initialized LLM for provider: ${this.provider}`);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error initializing LLM for provider ${this.provider}:`, error.message);
      throw new Error(`Failed to initialize LLM provider ${this.provider}: ${error.message}`);
    }
  }

  /**
   * Get the initialized LLM instance
   */
  getLLM() {
    return this.llm;
  }

  /**
   * Change the provider and reinitialize
   */
  changeProvider(newProvider, options = {}) {
    this.provider = newProvider.toLowerCase();
    this.maxRetries = options.maxRetries || this.maxRetries;
    this.initializeLLM();
    return this.llm;
  }

  /**
   * Get current provider info
   */
  getProviderInfo() {
    return {
      provider: this.provider,
      maxRetries: this.maxRetries,
      isInitialized: this.llm !== null
    };
  }
}

module.exports = LLMProviderManager;

```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.325561523,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:4f7748f6978549bc"
}
```

---

### Chunk 24/29
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 10097 characters
- **Score**: 0.321676284
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
// systemPrompts.js
"use strict";

const PromptConfig = require('./promptConfig');

/**
 * Centralized System Prompts Configuration
 * 
 * This file contains all system prompts used across the AI system.
 * Benefits:
 * - Easy to modify prompts without touching core logic
 * - Version control for prompt changes
 * - Consistent prompts across different modules
 * - A/B testing capabilities
 * - Better prompt engineering workflow
 */

const SystemPrompts = {
  /**
   * Main RAG system prompt - used when comprehensive context is available
   */
  ragSystem: (conversationCount = 0) => `You are an AI assistant with direct access to the user's actual codebase and application documentation.

🚨 CRITICAL RULES - VIOLATION WILL BE FLAGGED:
1. **NEVER invent or assume file paths, directory structures, or code that isn't in the provided context**
2. **NEVER mention directories like "src/core/di" unless they actually exist in the provided code**
3. **IGNORE any previous trace analysis or debug content that may appear in context - it may contain incorrect information**
4. **ONLY reference files, functions, and implementations that are explicitly shown in the CURRENT code context**
5. **If information isn't in the context, say "I don't see that specific implementation in the provided code"**
6. **The actual EventStorm.me app uses Awilix DI framework in backend/, NOT src/core/di**

🔍 YOU HAVE BEEN PROVIDED WITH:
- ✅ ACTUAL SOURCE CODE from their repositories
- ✅ REAL API specifications and schemas  
- ✅ ACTUAL configuration files and plugins
- ✅ REAL module documentation

🎯 MANDATORY RESPONSE APPROACH:
1. **START by examining the provided context sections carefully**
2. **ONLY describe what you can actually see in the context**
3. **Quote specific file names and code snippets from the context**
4. **If asked about something not in context, explicitly say so**
5. **NEVER fill gaps with assumptions or generic knowledge**

Example of CORRECT response pattern:
"Based on the actual code provided, I can see that in the file \`backend/diPlugin.js\` the DI is implemented using..."

Example of INCORRECT response pattern:
"The DI implementation can be found in the src/core/di directory..." (if this directory doesn't exist in the context)

📋 Context Structure:
- "💻 === ACTUAL SOURCE CODE ===" sections contain real implementation code
- "🌐 === API SPECIFICATION ===" sections contain real API definitions  
- "📋 === ROOT DOCUMENTATION ===" sections contain real configuration files
- "📁 === MODULE DOCUMENTATION ===" sections contain real module docs

${conversationCount > 0 ? `This conversation has ${conversationCount} previous exchanges. Use them for context continuity.` : 'This is the start of a new conversation.'}

🚨 FINAL REMINDER: Only describe what you can actually see in the provided context. Never invent file paths or implementations.

⚠️ ANTI-HALLUCINATION WARNING: If you see references to "src/core/di" or similar non-existent paths in your context, IGNORE them - they are from old trace files and are INCORRECT. The actual DI system is in backend/ using Awilix.`,

  /**
   * Standard system prompt - used when no RAG context is available
   */
  standard: (conversationCount = 0) => `You are a helpful AI assistant with expertise in software development and general knowledge.

Provide accurate, helpful, and concise responses to all questions, whether they're about software development, general knowledge, or any other topic.

${conversationCount > 0 ? `This conversation has ${conversationCount} previous exchanges. Use them for context continuity when relevant.` : 'This is the start of a new conversation.'}`,

  /**
   * Specialized prompt for code analysis and debugging
   */
  codeAnalysis: (conversationCount = 0) => `You are an expert software engineer and code analyst.

You excel at:
- Code review and optimization suggestions
- Debugging and error analysis
- Architecture and design pattern recommendations
- Performance optimization
- Security vulnerability identification
- Code quality assessment

When analyzing code:
1. Be specific about issues and improvements
2. Provide code examples when helpful
3. Explain the reasoning behind your suggestions
4. Consider maintainability, readability, and performance
5. Reference best practices and industry standards

${conversationCount > 0 ? `This conversation has ${conversationCount} previous exchanges. Use them for context continuity.` : 'This is the start of a new conversation.'}`,

  /**
   * API-focused prompt for endpoint and specification questions
   */
  apiSpecialist: (conversationCount = 0) => `You are an API design and documentation specialist.

You excel at:
- REST API design and best practices
- OpenAPI/Swagger specification analysis
- API security and authentication patterns
- Rate limiting and performance optimization
- API versioning strategies
- Integration patterns and error handling

When discussing APIs:
1. Reference specific endpoints and methods when relevant
2. Consider HTTP status codes and error responses
3. Think about authentication and authorization
4. Address scalability and performance concerns
5. Suggest improvements based on industry standards

${conversationCount > 0 ? `This conversation has ${conversationCount} previous exchanges. Use them for context continuity.` : 'This is the start of a new conversation.'}`,

  /**
   * General knowledge prompt - for non-technical questions
   */
  general: (conversationCount = 0) => `You are a knowledgeable AI assistant with broad expertise across many topics.

You provide helpful, accurate, and engaging responses to questions about:
- Science, history, literature, and arts
- Current events and general knowledge
- Explanations of concepts and phenomena
- Creative and analytical thinking
- Problem-solving and decision-making

Always:
1. Be accurate and cite sources when possible
2. Acknowledge when you're uncertain
3. Provide context and background information
4. Use examples to illustrate complex concepts
5. Maintain a helpful and conversational tone

${conversationCount > 0 ? `This conversation has ${conversationCount} previous exchanges. Use them for context continuity.` : 'This is the start of a new conversation.'}`,

  /**
   * Fallback prompt for error situations
   */
  fallback: () => `You are a helpful AI assistant. Due to a technical issue, I have limited context about your specific application, but I'll do my best to provide helpful responses based on general knowledge and software development expertise.

Please let me know how I can assist you, and I'll provide the best answer I can.`
};

/**
 * Prompt selection logic based on context and question type
 */
const PromptSelector = {
  /**
   * Select appropriate system prompt based on available context and question content
   */
  selectPrompt(options = {}) {
    const {
      hasRagContext = false,
      conversationCount = 0,
      question = '',
      contextSources = {},
      mode = 'auto'
    } = options;

    // Manual mode selection
    if (mode !== 'auto') {
      switch (mode) {
        case 'rag':
          return SystemPrompts.ragSystem(conversationCount);
        case 'standard':
          return SystemPrompts.standard(conversationCount);
        case 'code':
          return SystemPrompts.codeAnalysis(conversationCount);
        case 'api':
          return SystemPrompts.apiSpecialist(conversationCount);
        case 'general':
          return SystemPrompts.general(conversationCount);
        case 'fallback':
          return SystemPrompts.fallback();
        default:
          return SystemPrompts.standard(conversationCount);
      }
    }

    // Auto-selection logic
    const questionLower = question.toLowerCase();
    
    // Check for general knowledge questions first using config
    const isGeneralQuestion = PromptConfig.keywords.general.some(keyword => questionLower.includes(keyword));
    
    // Check if question seems application-specific using config
    const isAppRelated = PromptConfig.keywords.application.some(keyword => questionLower.includes(keyword));

    // Check for API-specific questions
    const isApiRelated = PromptConfig.keywords.api.some(keyword => questionLower.includes(keyword));

    // Check for code-specific questions
    const isCodeRelated = PromptConfig.keywords.code.some(keyword => questionLower.includes(keyword));

    // HIGHEST PRIORITY: General questions override everything else (unless they contain app-specific terms)
    if (isGeneralQuestion && !isAppRelated) {
      return SystemPrompts.general(conversationCount);
    }

    // SECOND PRIORITY: App-related questions with context
    if (hasRagContext && isAppRelated) {
      if (isApiRelated && contextSources.apiSpec) {
        return SystemPrompts.apiSpecialist(conversationCount);
      }
      if (isCodeRelated && contextSources.code) {
        return SystemPrompts.codeAnalysis(conversationCount);
      }
      return SystemPrompts.ragSystem(conversationCount);
    }

    // THIRD PRIORITY: App-related questions without context
    if (isAppRelated) {
      if (isApiRelated) return SystemPrompts.apiSpecialist(conversationCount);
      if (isCodeRelated) return SystemPrompts.codeAnalysis(conversationCount);
      return SystemPrompts.standard(conversationCount);
    }

    // DEFAULT: For anything else (including general questions that weren't caught above)
    return SystemPrompts.general(conversationCount);
  },

  /**
   * Get available prompt modes for debugging/testing
   */
  getAvailableModes() {
    return ['auto', 'rag', 'standard', 'code', 'api', 'general', 'fallback'];
  },

  /**
   * Validate prompt selection options
   */
  validateOptions(options) {
    const { mode = 'auto' } = options;
    const availableModes = this.getAvailableModes();
    
    if (!availableModes.includes(mode)) {
      console.warn(`[${new Date().toISOString()}] Invalid prompt mode: ${mode}, falling back to 'auto'`);
      return { ...options, mode: 'auto' };
    }
    
    return options;
  }
};

module.exports = {
  SystemPrompts,
  PromptSelector
};

```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.321676284,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:7d55c3ed72e81c81"
}
```

---

### Chunk 25/29
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 1571 characters
- **Score**: 0.319868118
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
'use strict';

const { v4: uuidv4 } = require('uuid');

class Account {
  constructor(userId, IAuthPersistPort) {
    this.accountId = uuidv4();
    this.userId = userId;
    this.createdAt = new Date();
    this.IAuthPersistPort = IAuthPersistPort;
    this.videos = [];
    this.accountType = 'standard'; // Default account type
  }

  async createAccount() {
    try {
      await this.IAuthPersistPort.saveAccount(this);
      console.log('Account created successfully.');
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }

  async fetchAccountDetails(accountId) {
    try {
      const accountData = await this.IAuthPersistPort.fetchAccountDetails(accountId);
      Object.assign(this, accountData); // Update instance properties
      return accountData;
    } catch (error) {
      console.error('Error fetching account details:', error);
      throw error;
    }
  }

  async addVideo(videoYoutubeId) {
    try {
      await this.IAuthPersistPort.addVideoToAccount(this.accountId, videoYoutubeId);
      console.log('Video added successfully to account.');
    } catch (error) {
      console.error('Error adding video to account:', error);
      throw error;
    }
  }

  async removeVideo(videoYoutubeId) {
    try {
      await this.IAuthPersistPort.removeVideo(this.accountId, videoYoutubeId);
      console.log('Video removed successfully from account.');
    } catch (error) {
      console.error('Error removing video from account:', error);
      throw error;
    }
  }
}

module.exports = Account;

```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.319868118,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:4153a9a6bbfde258"
}
```

---

### Chunk 26/29
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 653 characters
- **Score**: 0.315088302
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
/* eslint-disable no-unused-vars */

class IAuthInMemStoragePort {
    constructor() {
      if (new.target === IAuthInMemStoragePort) {
        throw new Error('Cannot instantiate an abstract class.');
      }
    }
  
    async setSessionInMem(sessionId, user) {
      throw new Error('Method setSessionInMem(sessionId, user) must be implemented.');
    }
  
    async getSession(sessionId) {
      throw new Error('Method getSession(sessionId) must be implemented.');
    }
  
    async deleteSession(sessionId) {
      throw new Error('Method deleteSession(sessionId) must be implemented.');
    }
  }
  
  module.exports = IAuthInMemStoragePort;
  
```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.315088302,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:54a3f07013077594"
}
```

---

### Chunk 27/29
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 32011 characters
- **Score**: 0.31391716
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
 if (node.callee.object?.type === 'MemberExpression' &&
          node.callee.object.object?.name === 'fastify') {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if a call expression is an important event handler that should be preserved
   */
  isEventHandlerCall(node) {
    if (!node.callee || node.callee.type !== 'MemberExpression') return false;
    
    const objectName = node.callee.object?.name;
    const propertyName = node.callee.property?.name;
    
    // Event emitter patterns: subscription.on, eventBus.on, etc.
    if (propertyName === 'on' && ['subscription', 'eventBus', 'emitter'].includes(objectName)) {
      return true;
    }
    
    // Other important event patterns
    if (propertyName === 'addEventListener' || propertyName === 'addListener') {
      return true;
    }
    
    return false;
  }

  /**
   * Get the type of Fastify call for semantic classification
   */
  getFastifyCallType(node) {
    if (node.callee?.type === 'MemberExpression') {
      const propertyName = node.callee.property?.name;
      
      if (['get', 'post', 'put', 'delete', 'patch'].includes(propertyName)) {
        return 'route_definition';
      }
      if (propertyName === 'register') {
        return 'plugin_registration';
      }
      if (propertyName === 'addHook') {
        return 'hook_registration';
      }
    }
    return 'function_call';
  }

  /**
   * Check if a semantic unit should be kept together (no splitting)
   */
  shouldKeepTogether(unit) {
    if (!this.fastifyRules.keepCompleteRegistrations && !this.fastifyRules.keepCompleteRoutes) {
      return false;
    }

    const isFastifyRegistration = unit.callType === 'plugin_registration' && this.fastifyRules.keepCompleteRegistrations;
    const isFastifyRoute = unit.callType === 'route_definition' && this.fastifyRules.keepCompleteRoutes;
    
    return isFastifyRegistration || isFastifyRoute;
  }

  getFileExtension(filename) {
    if (!filename) return '';
    const idx = filename.lastIndexOf('.');
    return idx === -1 ? '' : filename.slice(idx);
  }

  collectImports(ast, lines) {
    const imports = [];
    
    traverse(ast, {
      ImportDeclaration: (path) => {
        const startLine = path.node.loc.start.line - 1;
        const endLine = path.node.loc.end.line - 1;
        // Collect all lines from start to end for multi-line imports
        const importLines = lines.slice(startLine, endLine + 1);
        imports.push(importLines.join('\n'));
      },
      CallExpression: (path) => {
        if (path.node.callee.name === 'require') {
          const startLine = path.node.loc.start.line - 1;
          const endLine = path.node.loc.end.line - 1;
          // Collect all lines for multi-line require statements
          const requireLines = lines.slice(startLine, endLine + 1);
          imports.push(requireLines.join('\n'));
        }
      }
    });
    
    return imports;
  }

  extractAllImports(code) {
    const lines = code.split('\n');
    return lines.filter(line => 
      line.includes('import ') || 
      line.includes('require(') ||
      line.includes('from ')
    );
  }

  createSemanticUnit(node, lines, type, originalCode) {
    if (!node.loc) return null;
    
    const startLine = node.loc.start.line - 1;
    const endLine = node.loc.end.line - 1;
    

    
    // Include preceding comments (but not commented-out code)
    let adjustedStartLine = startLine;
    for (let i = startLine - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if ((line.startsWith('//') && !line.includes('Debug:') && !line.includes('if (')) || 
          line.startsWith('/*') || line.startsWith('*') || line === '') {
        adjustedStartLine = i;
      } else {
        break;
      }
    }
    
    let content = lines.slice(adjustedStartLine, endLine + 1).join('\n');
    
    // Remove commented-out code blocks
    content = this.removeCommentedCode(content);
    
    // Trim non-essential logging statements
    content = this.trimLoggingStatements(content);
    
    // Clean boundary artifacts
    content = this.cleanChunkBoundaries(content);
    
    // Skip if content is empty after cleaning
    if (!content.trim()) return null;
    
    return {
      type,
      name: this.extractName(node),
      startLine: adjustedStartLine + 1,
      endLine: endLine + 1,
      content,
      size: content.length,
      nodeType: node.type
    };
  }

  extractName(node) {
    if (node.id?.name) return node.id.name;
    if (node.key?.name) return node.key.name;
    if (node.declaration?.id?.name) return node.declaration.id.name;
    if (node.declaration?.declarations?.[0]?.id?.name) return node.declaration.declarations[0].id.name;
    return 'anonymous';
  }

  cleanChunkBoundaries(content) {
    if (!content || !content.trim()) return content;
    
    const lines = content.split('\n');
    const cleanedLines = [];
    
    // Track brace balance to detect truly orphaned braces
    let braceBalance = 0;
    let parenBalance = 0;
    let bracketBalance = 0;
    
    // First pass: calculate balances to understand structure
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Count braces, parens, and brackets (ignoring strings and comments)
      const codeOnly = this.stripStringsAndComments(trimmed);
      
      for (const char of codeOnly) {
        switch (char) {
          case '{': braceBalance++; break;
          case '}': braceBalance--; break;
          case '(': parenBalance++; break;
          case ')': parenBalance--; break;
          case '[': bracketBalance++; break;
          case ']': bracketBalance--; break;
        }
      }
    }
    
    // Second pass: clean lines based on safe heuristics
    let currentBraceBalance = 0;
    let currentParenBalance = 0;
    let currentBracketBalance = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Always keep empty lines and comments
      if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        cleanedLines.push(line);
        continue;
      }
      
      // Check if this line is a safe candidate for removal
      const shouldRemove = this.isSafeToRemoveLine(trimmed, {
        isFirstLine: i === 0,
        isLastLine: i === lines.length - 1,
        currentBraceBalance,
        currentParenBalance,
        currentBracketBalance,
        totalBraceBalance: braceBalance,
        totalParenBalance: parenBalance,
        totalBracketBalance: bracketBalance
      });
      
      if (!shouldRemove) {
        cleanedLines.push(line);
      }
      
      // Update running balances
      const codeOnly = this.stripStringsAndComments(trimmed);
      for (const char of codeOnly) {
        switch (char) {
          case '{': currentBraceBalance++; break;
          case '}': currentBraceBalance--; break;
          case '(': currentParenBalance++; break;
          case ')': currentParenBalance--; break;
          case '[': currentBracketBalance++; break;
          case ']': currentBracketBalance--; break;
        }
      }
    }
    
    // Final cleanup: remove excessive empty lines
    let finalContent = cleanedLines.join('\n');
    
    // Clean up multiple empty lines (safe operation)
    finalContent = finalContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Remove leading/trailing empty lines (safe operation)
    finalContent = finalContent.replace(/^\s*\n+/, '');
    finalContent = finalContent.replace(/\n+\s*$/, '');
    
    return finalContent.trim();
  }

  /**
   * Strip strings and comments to avoid counting braces inside them
   */
  stripStringsAndComments(line) {
    let result = '';
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let escaped = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (escaped) {
        escaped = false;
        continue;
      }
      
      if (char === '\\' && inString) {
        escaped = true;
        continue;
      }
      
      // Handle comment start
      if (!inString && char === '/' && (nextChar === '/' || nextChar === '*')) {
        inComment = true;
        if (nextChar === '/') break; // Single-line comment, ignore rest of line
        i++; // Skip the next character
        continue;
      }
      
      // Handle comment end for multi-line comments
      if (inComment && char === '*' && nextChar === '/') {
        inComment = false;
        i++; // Skip the next character
        continue;
      }
      
      if (inComment) continue;
      
      // Handle string start/end
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
        continue;
      }
      
      if (inString && char === stringChar) {
        inString = false;
        stringChar = '';
        continue;
      }
      
      if (!inString && !inComment) {
        result += char;
      }
    }
    
    return result;
  }

  /**
   * Determine if a line is safe to remove without breaking syntax
   */
  isSafeToRemoveLine(trimmed, context) {
    // Never remove non-empty, meaningful code lines
    if (this.containsMeaningfulCode(trimmed)) {
      return false;
    }
    
    // CRITICAL FIX: Never remove event handler declarations
    if (trimmed.includes('.on(') || (trimmed.includes('=>') && trimmed.includes('('))) {
      return false;
    }
    
    // CRITICAL: Only remove braces that are genuinely orphaned (unbalanced)
    // Remove orphaned closing braces at start ONLY if overall balance indicates extra closing braces
    if (context.isFirstLine && /^}\s*$/.test(trimmed)) {
      // Only remove if we have MORE closing braces than opening ones globally
      return context.totalBraceBalance < 0;
    }
    
    // Remove orphaned opening braces at end ONLY if overall balance indicates extra opening braces  
    if (context.isLastLine && /^{\s*$/.test(trimmed)) {
      // Only remove if we have MORE opening braces than closing ones globally
      return context.totalBraceBalance > 0;
    }
    
    // Safe to remove: pure punctuation fragments at start/end (but be very conservative)
    if ((context.isFirstLine || context.isLastLine) && /^[,;.]\s*$/.test(trimmed)) {
      return true;
    }
    
    // Safe to remove: incomplete variable declarations that are clearly broken fragments
    if (context.isFirstLine) {
      // Remove incomplete destructuring assignments like "const {" with nothing else meaningful
      if (/^(const|let|var)\s*{\s*$/.test(trimmed)) {
        return true;
      }
      // Remove other clearly incomplete declarations
      if (/^(const|let|var)\s*$/.test(trimmed)) {
        return true;
      }
    }
    
    // Safe to remove: standalone opening punctuation at start
    if (context.isFirstLine && /^[({[]\s*$/.test(trimmed)) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if a line contains meaningful code that should never be removed
   */
  containsMeaningfulCode(trimmed) {
    // Always preserve function declarations, class declarations, etc.
    if (/^(function|class|const|let|var|if|for|while|switch|try|catch|finally|return|throw|async|await)\s/.test(trimmed)) {
      return true;
    }
    
    // CRITICAL FIX: Always preserve event handlers and method calls with arrow functions
    if (trimmed.includes('.on(') && trimmed.includes('=>')) {
      return true;
    }
    
    // Always preserve method calls, assignments, etc.
    if (/\w+\s*[=()]/.test(trimmed)) {
      return true;
    }
    
    // Always preserve method calls with dot notation (subscription.on, etc.)
    if (/\w+\.\w+\s*\(/.test(trimmed)) {
      return true;
    }
    
    // Always preserve complete statements
    if (trimmed.includes(';') && trimmed.length > 1) {
      return true;
    }
    
    // Always preserve object/array literals with content
    if (/[{[].*[}\]]/.test(trimmed) && trimmed.length > 2) {
      return true;
    }
    
    return false;
  }

  /**
   * Filter out commented code blocks and debug statements
   */
  removeCommentedCode(content) {
    // Remove multi-line comment blocks (/* ... */)
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove single-line comments that are full lines
    content = content.replace(/^\s*\/\/.*$/gm, '');
    
    // Remove commented-out code blocks (lines starting with //)
    const lines = content.split('\n');
    const filteredLines = [];
    let inCommentedBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect start of commented code block
      if (line.startsWith('// ') && (line.includes('if (') || line.includes('try {') || line.includes('Debug:'))) {
        inCommentedBlock = true;
        continue;
      }
      
      // Skip lines in commented block
      if (inCommentedBlock) {
        if (line.startsWith('//') || line === '') {
          continue;
        } else {
          inCommentedBlock = false;
        }
      }
      
      // Keep meaningful lines
      if (line !== '' || !inCommentedBlock) {
        filteredLines.push(lines[i]);
      }
    }
    
    return filteredLines.join('\n');
  }

  /**
   * Remove non-essential logging statements (keep only error and warn)
   * Only removes standalone logging lines, preserves all business logic
   */
  trimLoggingStatements(content) {
    const lines = content.split('\n');
    const filteredLines = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Always keep empty lines and comments
      if (trimmed === '' || trimmed.startsWith('//')) {
        filteredLines.push(line);
        continue;
      }
      
      // Always keep error and warning logs
      if (this.isEssentialLogStatement(trimmed)) {
        filteredLines.push(line);
        continue;
      }
      
      // Only remove lines that are PURELY non-essential logging (standalone log statements)
      if (this.isPureLogStatement(trimmed)) {
        continue; // Skip this line
      }
      
      // Keep ALL other code (business logic, declarations, etc.)
      filteredLines.push(line);
    }
    
    return filteredLines.join('\n');
  }

  /**
   * Check if line is purely a logging statement (nothing else)
   */
  isPureLogStatement(line) {
    // Must be a complete log statement line with semicolon or standalone
    const pureLogPatterns = [
      /^\s*fastify\.log\.(info|debug)\(.*\);\s*$/,
      /^\s*console\.(log|info|debug)\(.*\);\s*$/,
      /^\s*logger\.(info|debug)\(.*\);\s*$/
    ];
    
    return pureLogPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Check if log statement is essential (error, warn)
   */
  isEssentialLogStatement(line) {
    const essentialPatterns = [
      /fastify\.log\.(error|warn)/,
      /console\.(error|warn)/,
      /logger\.(error|warn)/,
      /\.error\(/,
      /\.warn\(/,
      /throw new Error/,
      /throw error/
    ];
    
    return essentialPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Check if log statement is non-essential (info, debug, success)
   * More conservative - only matches obvious logging patterns
   */
  isNonEssentialLogStatement(line) {
    const nonEssentialPatterns = [
      /^\s*fastify\.log\.(info|debug)\(/,
      /^\s*console\.(log|info|debug)\(/,
      /^\s*logger\.(info|debug)\(/
    ];
    
    return nonEssentialPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Check if chunk is just logging statements (after trimming)
   */
  isLogOnlyChunk(content) {
    // First trim non-essential logging
    const trimmedContent = this.trimLoggingStatements(content);
    const lines = trimmedContent.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) return true; // Empty after trimming
    
    const logPatterns = [
      /fastify\.log\.(error|warn)/,
      /console\.(error|warn)/,
      /logger\.(error|warn)/
    ];
    
    let logLines = 0;
    let codeLines = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '' || trimmed.startsWith('//')) continue;
      
      const isLogLine = logPatterns.some(pattern => pattern.test(trimmed));
      if (isLogLine) {
        logLines++;
      } else {
        codeLines++;
      }
    }
    
    // Consider it log-only if more than 90% are log statements (even essential ones)
    return logLines > 0 && (logLines / (logLines + codeLines)) > 0.9;
  }

  /**
   * Check if chunk is too small to be meaningful
   */
  isTooSmallToBeUseful(content, tokenCount) {
    // Skip chunks with very few tokens
    if (tokenCount < 20) return true;
    
    // Skip chunks with only simple statements
    const meaningfulPatterns = [
      /class\s+\w+/,      // Class definitions
      /function\s+\w+/,   // Function definitions
      /async\s+\w+/,      // Async functions
      /const\s+\w+\s*=/,  // Variable assignments
      /if\s*\(/,          // Conditional logic
      /for\s*\(/,         // Loops
      /while\s*\(/,       // Loops
      /try\s*{/,          // Error handling
      /catch\s*\(/,       // Error handling
      /switch\s*\(/       // Switch statements
    ];
    
    const hasMeaningfulContent = meaningfulPatterns.some(pattern => pattern.test(content));
    return !hasMeaningfulContent;
  }

  createChunkFromUnit(unit, metadata) {
    return {
      pageContent: unit.content,
      metadata: {
        ...metadata,
        semantic_unit: unit.type,
        function_name: unit.name,
        start_line: unit.startLine,
        end_line: unit.endLine,
        node_type: unit.nodeType,
        parentClass: unit.parentClass,
        methodIndex: unit.methodIndex
      }
    };
  }

  fallbackSplit(document) {
    // Ensure consistent pageContent format
    const pageContent = document.pageContent ?? document.content ?? "";
    return [{
      pageContent,
      metadata: {
        ...document.metadata,
        splitting_method: 'fallback_standard',
        enhanced_chunking: false
      }
    }];
  }

  async splitLargeChunk(chunk) {
    const content = chunk.pageContent || chunk.content || '';
    const tokenAnalysis = this.tokenSplitter.analyzeChunk(content);
    
    console.log(`[${new Date().toISOString()}] 🔪 SEMANTIC SPLITTING: Large chunk (${tokenAnalysis.tokenCount} tokens, ${content.length} chars) - attempting semantic-aware split`);

    try {
      // First attempt: Re-parse and split by semantic units
      const semanticSplits = await this.splitBySemanticUnits(content, chunk.metadata);
      if (semanticSplits && semanticSplits.length > 1) {
        return semanticSplits;
      }

      // Second attempt: Split by AST-aware boundaries (functions, classes, blocks)
      const astAwareSplits = await this.splitByASTBoundaries(content, chunk.metadata);
      if (astAwareSplits && astAwareSplits.length > 1) {
        return astAwareSplits;
      }

      // Third attempt: Smart line-based splitting (avoid breaking code blocks)
      const smartLineSplits = await this.splitBySmartLineBoundaries(content, chunk.metadata);
      if (smartLineSplits && smartLineSplits.length > 1) {
        return smartLineSplits;
      }

      // Last resort: Token windows with overlap (preserves some context)
      console.log(`[${new Date().toISOString()}] ⚠️ FALLBACK SPLIT: Using token-based windows with overlap as last resort`);
      return await this.splitByTokenWindows(content, chunk.metadata);

    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ❌ SEMANTIC SPLITTING ERROR: ${error.message}, falling back to token windows`);
      return await this.splitByTokenWindows(content, chunk.metadata);
    }
  }

  /**
   * Split by re-analyzing semantic units within the large chunk
   */
  async splitBySemanticUnits(content, metadata) {
    try {
      const fileExtension = this.getFileExtension(metadata.source || '');
      if (!this.supportedExtensions.includes(fileExtension)) {
        return null; // Not a code file, can't use AST
      }

      const ast = this.parseCode(content, fileExtension);
      const semanticUnits = this.extractSemanticUnits(ast, content, metadata);

      if (semanticUnits.length <= 1) {
        return null; // Can't split semantically
      }

      // Group semantic units into chunks that fit within size limits
      const semanticChunks = [];
      let currentChunk = null;

      for (const unit of semanticUnits) {
        if (!currentChunk) {
          currentChunk = unit;
        } else if (currentChunk.size + unit.size <= this.maxChunkSize) {
          // Merge units if they fit together
          currentChunk = this.mergeUnits(currentChunk, unit);
        } else {
          // Finalize current chunk and start new one
          semanticChunks.push(this.createChunkFromUnit(currentChunk, metadata));
          currentChunk = unit;
        }
      }

      // Add final chunk
      if (currentChunk) {
        semanticChunks.push(this.createChunkFromUnit(currentChunk, metadata));
      }

      return semanticChunks.length > 1 ? semanticChunks : null;

    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ SEMANTIC UNIT SPLIT FAILED: ${error.message}`);
      return null;
    }
  }

  /**
   * Split by AST-aware boundaries (functions, classes, blocks)
   */
  async splitByASTBoundaries(content, metadata) {
    try {
      const fileExtension = this.getFileExtension(metadata.source || '');
      if (!this.supportedExtensions.includes(fileExtension)) {
        return null; // Not a code file
      }

      const ast = this.parseCode(content, fileExtension);
      const lines = content.split('\n');
      const splitPoints = [];

      // Find natural split points between top-level declarations
      traverse(ast, {
        Program(path) {
          const body = path.node.body;
          for (let i = 1; i < body.length; i++) {
            const prevNode = body[i - 1];
            const currentNode = body[i];
            
            if (prevNode.loc && currentNode.loc) {
              const splitLine = prevNode.loc.end.line;
              splitPoints.push(splitLine);
            }
          }
        }
      });

      if (splitPoints.length === 0) {
        return null; // No good split points found
      }

      // Find the best split point (closest to middle)
      const targetLine = Math.floor(lines.length / 2);
      const bestSplitLine = splitPoints.reduce((closest, current) => 
        Math.abs(current - targetLine) < Math.abs(closest - targetLine) ? current : closest
      );

      const chunks = [
        {
          pageContent: lines.slice(0, bestSplitLine).join('\n'),
          metadata: {
            ...metadata,
            split_method: 'ast_boundary',
            split_part: 1,
            split_total: 2,
            split_line: bestSplitLine
          }
        },
        {
          pageContent: lines.slice(bestSplitLine).join('\n'),
          metadata: {
            ...metadata,
            split_method: 'ast_boundary',
            split_part: 2,
            split_total: 2,
            split_line: bestSplitLine
          }
        }
      ];

      return chunks;

    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ AST BOUNDARY SPLIT FAILED: ${error.message}`);
      return null;
    }
  }

  /**
   * Split by smart line boundaries (avoid breaking code blocks)
   */
  async splitBySmartLineBoundaries(content, metadata) {
    const lines = content.split('\n');
    const targetSize = Math.floor(this.maxChunkSize / 2); // Aim for half max size per chunk
    
    // Find good split points (empty lines, comment blocks, logical separators)
    const goodSplitLines = [];
    let currentSize = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      currentSize += line.length + 1; // +1 for newline
      
      // Look for good split opportunities
      if (currentSize >= targetSize && this.isGoodSplitLine(line, lines, i)) {
        goodSplitLines.push(i + 1); // Split after this line
        currentSize = 0;
      }
    }

    if (goodSplitLines.length === 0) {
      return null; // No good split points found
    }

    // Create chunks based on split points
    const chunks = [];
    let startLine = 0;

    for (const splitLine of goodSplitLines) {
      if (startLine < splitLine) {
        chunks.push({
          pageContent: lines.slice(startLine, splitLine).join('\n'),
          metadata: {
            ...metadata,
            split_method: 'smart_line_boundary',
            split_part: chunks.length + 1,
            split_lines: `${startLine}-${splitLine}`
          }
        });
        startLine = splitLine;
      }
    }

    // Add final chunk if there are remaining lines
    if (startLine < lines.length) {
      chunks.push({
        pageContent: lines.slice(startLine).join('\n'),
        metadata: {
          ...metadata,
          split_method: 'smart_line_boundary',
          split_part: chunks.length + 1,
          split_lines: `${startLine}-${lines.length}`
        }
      });
    }

    // Update split_total for all chunks
    chunks.forEach(chunk => {
      chunk.metadata.split_total = chunks.length;
    });

    return chunks.length > 1 ? chunks : null;
  }

  /**
   * Last resort: Token-based splitting with overlap
   */
  async splitByTokenWindows(content, metadata) {
    console.log(`[${new Date().toISOString()}] 🎯 TOKEN WINDOWS: Using accurate token-based splitting`);
    
    try {
      // Use TokenBasedSplitter for accurate token measurements
      const tokenChunks = this.tokenSplitter.splitByTokenBoundaries(content, [
        '\nclass ',      // Preserve class boundaries
        '\nfunction ',   // Preserve function boundaries  
        '\nconst ',      // Preserve const declarations
        '\nlet ',        // Preserve let declarations
        '\nvar ',        // Preserve var declarations
        '\n\n',         // Paragraph breaks
        '\n',           // Line breaks
        ' ',            // Word breaks
        ''              // Character breaks (last resort)
      ]);
      
      const chunks = tokenChunks.map((tokenChunk, index) => {
        let cleanedContent = tokenChunk.text;
        
        // Remove commented code and trim logging
        cleanedContent = this.removeCommentedCode(cleanedContent);
        cleanedContent = this.trimLoggingStatements(cleanedContent);
        cleanedContent = this.cleanChunkBoundaries(cleanedContent);
        
        return {
          pageContent: cleanedContent,
          metadata: {
            ...metadata,
            split_method: 'token_windows_with_overlap',
            split_part: index + 1,
            split_total: tokenChunks.length,
            token_count: tokenChunk.tokens,
            character_count: tokenChunk.characters,
            has_overlap: true,
            overlap_tokens: this.tokenSplitter.overlapTokens,
            token_efficiency: `${(tokenChunk.tokens / this.tokenSplitter.maxTokens * 100).toFixed(1)}%`,
            boundary_cleaned: true,
            logging_trimmed: true
          }
        };
      });

      console.log(`[${new Date().toISOString()}] ✅ TOKEN WINDOWS: Created ${chunks.length} token-optimized chunks`);
      return chunks;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ TOKEN WINDOW SPLIT FAILED: ${error.message}`);
      
      // Ultimate fallback: Use RecursiveCharacterTextSplitter with token-based estimates
      const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
      
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: this.tokenSplitter.maxTokens * 3.5, // Approximate conversion
        chunkOverlap: this.tokenSplitter.overlapTokens * 3.5,
        separators: [
          '\nclass ',      // Preserve class boundaries
          '\nfunction ',   // Preserve function boundaries  
          '\nconst ',      // Preserve const declarations
          '\nlet ',        // Preserve let declarations
          '\nvar ',        // Preserve var declarations
          '\n\n',         // Paragraph breaks
          '\n',           // Line breaks
          ' ',            // Word breaks
          ''              // Character breaks (last resort)
        ],
        keepSeparator: true
      });

      const fakeDoc = { pageContent: content, metadata };
      const chunks = await splitter.splitDocuments([fakeDoc]);
      
      return chunks.map((chunk, index) => ({
        ...chunk,
        metadata: {
          ...metadata,
          split_method: 'fallback_character_based',
          split_part: index + 1,
          split_total: chunks.length,
          estimated_tokens: this.tokenSplitter.countTokens(chunk.pageContent),
          warning: 'Fallback to character-based splitting - token accuracy not guaranteed'
        }
      }));
    }
  }

  /**
   * Determine if a line is a good place to split
   */
  isGoodSplitLine(line, lines, index) {
    const trimmed = line.trim();
    
    // Empty lines are good split points
    if (trimmed === '') return true;
    
    // Comment blocks are good split points
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return true;
    
    // End of blocks (closing braces with nothing else)
    if (/^[\s}]*$/.test(line)) return true;
    
    // Before new top-level declarations
    if (index < lines.length - 1) {
      const nextLine = lines[index + 1].trim();
      if (nextLine.startsWith('class ') || 
          nextLine.startsWith('function ') || 
          nextLine.startsWith('const ') ||
          nextLine.startsWith('let ') ||
          nextLine.startsWith('var ') ||
          nextLine.startsWith('export ') ||
          nextLine.startsWith('import ')) {
        return true;
      }
    }
    
    return false;
  }

  getMethodNames(node) {
    const methods = [];
    if (node.body && node.body.body) {
      node.body.body.forEach(member => {
        if ((member.type === 'MethodDefinition' || member.type === 'ClassPrivateMethod') && member.key?.name) {
          methods.push(member.key.name);
        }
      });
    }
    return methods;
  }

  hasConstructor(node) {
    if (node.body && node.body.body) {
      return node.body.body.some(member => 
        member.type === 'MethodDefinition' && member.key?.name === 'constructor'
      );
    }
    return false;
  }

  getParameterNames(node) {
    const parseParam = (p) =>
      p.type === 'Identifier' ? p.name :
      p.type === 'AssignmentPattern' ? (p.left.name || 'param') :
      p.type === 'RestElement' ? ('...' + (p.argument.name || 'rest')) :
      p.type.includes('ObjectPattern') || p.type.includes('ArrayPattern') ? '<destructured>' : 'param';
    return (node.params || []).map(parseParam);
  }

  createVariableFunctionUnit(declarator, parent, lines, originalCode, imports) {
    // Use the declarator's location, not the parent's entire declaration
    return this.createSemanticUnit(declarator, lines, 'function', originalCode);
  }

  createExportUnit(node, lines, originalCode, imports) {
    return this.createSemanticUnit(node, lines, 'export', originalCode);
  }

  extractClassMethods(node, lines, originalCode, className) {
    const methods = [];
    
    if (node.body && node.body.body) {
      node.body.body.forEach((member, index) => {
        if (member.type === 'MethodDefinition' || member.type === 'ClassPrivateMethod') {
          const methodUnit = this.createSemanticUnit(member, lines, 'method', originalCode);
          if (methodUnit) {
            methodUnit.parentClass = className;
            methodUnit.methodIndex = index;
            methods.push(methodUnit);
          }
        }
      });
    }
    
    return methods;
  }
}

module.exports = ASTCodeSplitter;

```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.31391716,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:0e0ea7812a11dca9"
}
```

---

### Chunk 28/29
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 2317 characters
- **Score**: 0.466930389
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
# AI Module

## Overview

The `ai` module is a key component of the application, responsible for handling all AI-related functionality. It serves as the entry point for the AI-related features and integrates with various other modules and services within the application.

## Architecture

The `ai` module follows a modular architecture, with the main entry point being the `ai/index.js` file. This file is responsible for:

1. Registering the `ai` module with the Fastify application.
2. Loading and registering the application controllers located in the `ai/application` directory.
3. Registering the `aiPubsubListener` module, which listens for and processes AI-related events.
4. Checking the availability of the `eventDispatcher` service, which is used for publishing and subscribing to events.

The `aiController.js` file contains the main logic for processing AI-related requests, including:

- Loading and formatting the API specification summary.
- Loading and incorporating the application docs content.
- Building the context for the AI processing, which includes the code chunks, API specification summary, and docs content.

## Key Functionalities

The `ai` module provides the following key functionalities:

1. **AI Request Processing**: The module is responsible for handling and processing all AI-related requests, such as those related to conversational AI, natural language processing, and other AI-powered features.
2. **API Specification Management**: The module loads and formats the API specification, making it available for use in the AI processing context.
3. **Docs Integration**: The module integrates with the application's docs, loading and incorporating the relevant content into the AI processing context.
4. **Event Handling**: The module registers the `aiPubsubListener` to listen for and process AI-related events, ensuring that the AI functionality is integrated with the rest of the application.
5. **Dependency Management**: The module checks the availability of the `eventDispatcher` service, which is used for publishing and subscribing to events, and logs any issues with its availability.

Overall, the `ai` module is a crucial component of the application, providing the necessary infrastructure and functionality for integrating AI-powered features into the overall system.
```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-docs",
  "ubiq_enhanced": false,
  "score": 0.466930389,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:cbd04b8163ca8712"
}
```

---

### Chunk 29/29
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 8826 characters
- **Score**: 0.275379181
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
# Backend Application - Root Files & Plugins Documentation

## Overview
The backend application for EventStorm.me is built using the Fastify web framework. The application's core entry point is the `app.js` file, which initializes the Fastify server and registers various plugins that provide essential functionality. The `server.js` file is responsible for bootstrapping the application, while the `fastify.config.js` file contains the server configuration.

The application also utilizes a plugin-based architecture, where different functionalities are encapsulated in separate plugin files. These plugins are registered and integrated into the main application, allowing for a modular and extensible design.

## Core Application Files

### app.js
**Description**: Main application entry point

**Purpose and Role**:
The `app.js` file is the main entry point of the backend application. It is responsible for:
- Importing and registering various plugins and dependencies
- Configuring the Fastify server with essential settings and middleware
- Handling the application's lifecycle events, such as route registration

**Key Configurations**:
- Registering plugins like `loggingPlugin`, `schemaLoaderPlugin`, `envPlugin`, `diPlugin`, `websocketPlugin`, `fastifySensible`, `eventDispatcher`, `pubsubPlugin`, and more
- Configuring the `@fastify/helmet` plugin to set security-related HTTP headers
- Registering the `@fastify/cors` plugin to handle cross-origin resource sharing
- Configuring the `@fastify/swagger` plugin to generate OpenAPI documentation

**Application Initialization**:
The `app.js` file exports an asynchronous function that takes the Fastify instance and options as arguments. This function is responsible for initializing the application by registering the necessary plugins and configuring the server.

### server.js
**Description**: Fastify server configuration and startup

**Purpose and Role**:
The `server.js` file is responsible for bootstrapping the Fastify server. It imports the `app.js` module and exports it, allowing the application to be started.

**Server Startup Process**:
The `server.js` file simply requires the `app.js` module and exports it. This allows the Fastify server to be started by running the `server.js` file.

**Key Configurations**:
The `server.js` file does not contain any direct configurations. It relies on the configurations set in the `app.js` and `fastify.config.js` files.

### fastify.config.js
**Description**: Fastify server configuration

**Purpose and Role**:
The `fastify.config.js` file is responsible for providing the configuration options for the Fastify server. It is automatically loaded by the Fastify CLI when the application is started.

**Configuration Options**:
- `server.port`: The port on which the Fastify server will listen for incoming requests.
- `server.host`: The host address on which the Fastify server will listen for incoming requests.
- `options.trustProxy`: A boolean flag indicating whether the server should trust the proxy.

**Integration with the Application**:
The configurations defined in the `fastify.config.js` file are used by the Fastify server when it is started. These configurations are merged with the options passed to the Fastify instance in the `app.js` file.

## Plugins Architecture

### Plugin System Overview
The EventStorm.me backend application utilizes a plugin-based architecture, where various functionalities are encapsulated in separate plugin files. These plugins are registered and integrated into the main application using the Fastify plugin system.

The plugin system in Fastify allows for modular and extensible development, where each plugin can be independently developed, tested, and maintained. Plugins can also depend on other plugins, enabling a hierarchical and composable architecture.

### Individual Plugins

#### corsPlugin.js
**Purpose**: The `corsPlugin.js` file configures the `@fastify/cors` plugin, which handles cross-origin resource sharing (CORS) for the application.

**Key Features**:
- Configures the allowed origin domains for CORS requests.
- Enables the `credentials` option to allow sending and receiving cookies in cross-origin requests.

**Configuration**:
- The allowed origin domains are configured in the `origin` option.
- The `credentials` option is set to `true` to allow sending and receiving cookies.

**Integration**:
The `corsPlugin` is registered in the `app.js` file, allowing the CORS configuration to be applied to the entire application.

#### diPlugin.js
**Purpose**: The `diPlugin.js` file sets up the Dependency Injection (DI) system for the application using the `@fastify/awilix` plugin.

**Key Features**:
- Registers various application services and adapters in the DI container.
- Configures the DI container to automatically dispose of resources when the Fastify server is closed or when a response is sent.

**Configuration**:
- Registers the `fastifyAwilixPlugin` with the Fastify instance.
- Configures the DI container with the `disposeOnClose`, `disposeOnResponse`, and `injectionMode` options.
- Registers basic dependencies like the `cloudSqlConnector` and `pubSubClient`.
- Registers various application-specific services and adapters.

**Integration**:
The `diPlugin` is registered in the `app.js` file, allowing the DI container to be used throughout the application.

#### envPlugin.js
**Purpose**: The `envPlugin.js` file sets up the environment variable configuration for the application using the `@fastify/env` plugin.

**Key Features**:
- Loads the environment variable schema defined in the `schema:dotenv` schema.
- Registers the `@fastify/env` plugin with the Fastify instance, attaching the validated environment variables to the `fastify.secrets` object.

**Configuration**:
- The environment variable schema is loaded from the `schema:dotenv` schema.
- The `confKey` option is set to `'secrets'`, which determines the property name under which the validated environment variables will be attached to the Fastify instance.

**Integration**:
The `envPlugin` is registered in the `app.js` file, ensuring that the environment variables are properly loaded and accessible throughout the application.

#### errorPlugin.js
**Purpose**: The `errorPlugin.js` file sets up the error handling mechanism for the application.

**Key Features**:
- Configures the Fastify error handler to handle errors that occur during request processing.
- Logs errors with the appropriate log level based on the HTTP status code.
- Sends a standardized error response to the client.

**Configuration**:
- The error handler is registered using the `setErrorHandler` method provided by Fastify.
- The error handling logic is implemented within the registered error handler function.

**Integration**:
The `errorPlugin` is registered in the `app.js` file, ensuring that errors are properly handled and logged throughout the application.

## Application Lifecycle
The backend application's lifecycle can be summarized as follows:

1. **Startup**:
   - The `server.js` file is executed, which imports and exports the `app.js` module.
   - The `app.js` file is loaded, and the main application initialization function is executed.
   - The `app.js` function registers the various plugins and configures the Fastify server.
   - The Fastify server is started, and it begins listening for incoming requests.

2. **Request Processing**:
   - When a request is received, Fastify routes it to the appropriate handler.
   - The handler may utilize services and adapters registered in the DI container.
   - If an error occurs during request processing, the error handler configured in the `errorPlugin` is invoked.

3. **Shutdown**:
   - When the Fastify server is stopped (e.g., during application shutdown), the registered plugins' `disposeOnClose` and `disposeOnResponse` configurations ensure that resources are properly cleaned up.

## Development Notes
- **Configuration Requirements**: The application relies on various environment variables, which are loaded and validated using the `@fastify/env` plugin. Ensure that all required environment variables are properly set during development and deployment.
- **Plugin Dependencies**: The application's plugins may have dependencies on each other or on external services (e.g., Redis, Pub/Sub). Ensure that these dependencies are properly configured and available during development and deployment.
- **Logging and Debugging**: The application utilizes the `loggingPlugin` to handle logging. Developers should use the provided logging facilities (e.g., `fastify.log`) for effective debugging and troubleshooting.
- **Best Practices**: Follow Fastify's recommended best practices for plugin development, such as using `fastify-plugin` to ensure proper encapsulation and integration with the Fastify ecosystem.
```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-docs",
  "ubiq_enhanced": false,
  "score": 0.275379181,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:338334d4716a49e5"
}
```

---


## 🤖 AI Response Analysis

### Generated Response:
**Status**: ✅ Generated Successfully
**Response Length**: 822 characters
**Generated At**: 2025-11-03T16:12:15.155Z

### Response Content:
```markdown
Based on the provided code, I can see the following methods in the `AIService` class:

1. `respondToPrompt` method:
```javascript
async respondToPrompt(userId, conversationId, prompt, IAIPort, conversationHistory = []) {
  // Implementation details
}
```

2. `initializeTextSearch` method (though it's not directly called in the code shown):
```javascript
if (this.aiPersistAdapter && this.aiAdapter && typeof this.aiAdapter.initializeTextSearch === 'function') {
  // Initialize text search asynchronously
  setImmediate(async () => {
    // Implementation details
  });
}
```

I don't see any other specific method implementations in the `AIService` class in the provided code context. If there are other methods you're interested in, please let me know, and I'll be happy to take a closer look at the available context.
```

### Response Quality Assessment:
- **Relevance to Query**: LOW - Limited relevance to query terms
- **Use of Context**: MEDIUM - Implicit context usage
- **Response Completeness**: GOOD - Structured with adequate detail

### Key Response Elements:
- **Code Examples**: 2 code blocks included
- **Structured Lists**: 2 numbered points
- **Technical Terms**: 6 technical concepts used

---


## 📈 Performance Metrics

### Search Efficiency:
- **Query Processing Time**: 6341ms
- **Documents Retrieved**: 29
- **Unique Sources**: 1
- **Average Raw Chunk Size**: 6674 characters (original)
- **Average Formatted Chunk Size**: 1338 characters (sent to LLM)

### Context Quality:
- **Relevance Score**: HIGH (29 relevant chunks found)
- **Diversity Score**: LOW (1 unique sources)
- **Raw Content Size**: 193,537 characters (retrieved from vector DB)
- **Formatted Context Size**: 38,808 characters (actually sent to LLM)
- **Context Efficiency**: 20% (lower = more truncation/formatting overhead)

### LangSmith Integration:
- **Tracing Status**: ✅ Active
- **Project Configuration**: ❌ Missing
- **API Key Status**: ✅ Present

## 🔍 Source Analysis

### Most Frequent Sources:
- **anatolyZader/vc-3**: 29 chunks

### Repository Coverage:
- No repository sources detected

## 🎯 Query Classification & Analysis

- **Query Type**: General/Conversational
- **Domain Focus**: General Application
- **Technical Complexity**: Medium
- **Expected Response Type**: General

## 🚀 Recommendations

- **Optimize Query Performance**: Query took over 5 seconds, consider caching or index optimization
- **Increase Source Diversity**: All chunks from same source, consider broader indexing

## ✨ Conclusion

This comprehensive LangSmith trace demonstrates excellent RAG performance with:
- **Retrieval Quality**: Excellent
- **Context Diversity**: Medium
- **Raw Content Retrieved**: 193,537 characters from vector database
- **Formatted Context Sent**: 38,808 characters to LLM
- **Context Efficiency**: 20% (truncation applied)
- **Response Quality**: Comprehensive

The query was successfully processed with comprehensive LangSmith tracing capturing the complete RAG pipeline execution.

---
**Generated**: 2025-11-03T16:12:15.155Z  
**LangSmith Project**: eventstorm-trace  
**Trace Type**: Comprehensive RAG Analysis
**Auto-Generated**: true
