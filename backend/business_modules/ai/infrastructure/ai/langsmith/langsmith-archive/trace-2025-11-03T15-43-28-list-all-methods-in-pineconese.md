---
**ARCHIVED TRACE ANALYSIS**
- Archived on: 2025-11-03T15:43:28.097Z
- Triggered by query: "list all methods in pineconeService.js"
- Original file: latest-trace-analysis.md
---

# LangSmith RAG Trace Analysis - 11/3/2025, 3:41:37 PM

## 🔍 Query Details
- **Query**: "list all methods iin userService.js"
- **User ID**: d41402df-182a-41ec-8f05-153118bf2718
- **Conversation ID**: d1644585-4365-4460-9f4c-db0316803d4c
- **Started**: 2025-11-03T15:41:37.392Z
- **Completed**: 2025-11-03T15:41:42.810Z
- **Total Duration**: 5418ms

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
1. **initialization** (2025-11-03T15:41:37.392Z) - success
2. **vector_store_check** (2025-11-03T15:41:37.392Z) - success
3. **vector_search** (2025-11-03T15:41:40.036Z) - success - Found 31 documents
4. **text_search** (2025-11-03T15:41:40.058Z) - success
5. **hybrid_search_combination** (2025-11-03T15:41:40.058Z) - success
6. **context_building** (2025-11-03T15:41:40.060Z) - success - Context: 42302 chars
7. **response_generation** (2025-11-03T15:41:42.810Z) - success - Response: 635 chars

## 📊 Vector Search Analysis

### Search Configuration:
- **Vector Store**: primary
- **Search Strategy**: intelligent_strategy_with_filters
- **Documents Retrieved**: 31
- **Raw Content Size**: 147,816 characters (original chunks)
- **Formatted Context Size**: 42,302 characters (sent to LLM)
- **Compression Ratio**: 29% (due to truncation + formatting overhead)

### Source Type Distribution:
- **GitHub Repository Code**: 31 chunks (100%)
- **Module Documentation**: 0 chunks (0%)  
- **Architecture Documentation**: 0 chunks (0%)
- **API Specification**: 0 chunks (0%)
- **Other Sources**: 0 chunks (0%)

## 🏷️ Ubiquitous Language (UL) Tags Analysis

### UL Tag Coverage:
- **Chunks with UL Tags**: 0/31 (0%)
- **Chunks without UL Tags**: 31/31 (100%)
- **Coverage Status**: ❌ Poor - Repository may need re-indexing

### Domain Coverage:
- **Bounded Contexts**: 0 unique contexts
  
- **Business Modules**: 0 unique modules
  
- **Total UL Terms**: 0 terms found across all chunks
- **Unique Terms**: 0 distinct terms
  
- **Domain Events**: 0 unique events
  

### ⚠️ Missing UL Tags Warning:
31 chunks (100%) are missing ubiquitous language tags. This may indicate:
- Files indexed before UL enhancement was implemented (check `processedAt` timestamps)
- Non-code files (markdown analysis files, configs) that bypass UL processing
- Repository needs re-indexing to apply current UL enhancement pipeline
- Error during UL enhancement (check logs for warnings)

**Recommendation**: 🔴 **CRITICAL**: Re-index repository to apply UL tags to all chunks



## 📋 Complete Chunk Analysis


### Chunk 1/31
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 5324 characters
- **Score**: 0.342615128
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
  "score": 0.342615128,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:7498c4d3da949337"
}
```

---

### Chunk 2/31
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 9745 characters
- **Score**: 0.323036194
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
  "score": 0.323036194,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:837b8a6d03d2443b"
}
```

---

### Chunk 3/31
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 3119 characters
- **Score**: 0.30884552
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
// docsPostgresAdapter.js
'use strict';

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const IDocsPersistPort = require('../../domain/ports/IDocsPersistPort');

const isLocal = process.env.NODE_ENV !== 'staging';

class DocsPostgresAdapter extends IDocsPersistPort {
  constructor({ cloudSqlConnector }) {
    super();
    this.connector = cloudSqlConnector;

    this.poolPromise = isLocal
      ? this.createLocalPool()
      : this.createCloudSqlPool(cloudSqlConnector);
  }

  async getPool() {
    if (!this.pool) {
      this.pool = await this.poolPromise;
    }
    return this.pool;
  }

  createLocalPool() {
    const config = {
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      host: 'localhost',
      port: 5432,
    };
    return Promise.resolve(new Pool(config));
  }

  async createCloudSqlPool(connector) {
    const instanceConnectionName = process.env.CLOUD_SQL_CONNECTION_NAME;
    if (!instanceConnectionName) {
      throw new Error('❌ CLOUD_SQL_CONNECTION_NAME env var not set.');
    }

    const clientOpts = await connector.getOptions({
      instanceConnectionName,
      ipType: 'PRIVATE',
      authType: 'ADC',
    });

    const config = {
      ...clientOpts,
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
    };

    console.info('[DB] Using Cloud SQL config for:', instanceConnectionName);
    return new Pool(config);
  }

  async persistDocs(userId, repoId, fetchedDocs) {
    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO docss (repo_id, user_id, docs_data, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (repo_id)
        DO UPDATE SET docs_data = EXCLUDED.docs_data, updated_at = NOW();
      `;
      await client.query(query, [repoId, userId, fetchedDocs]);
      console.log(`Docs for repo ${repoId} persisted.`);
    } catch (error) {
      console.error('Error persisting docs:', error);
      throw error;
    } finally {
      client.release();
    }
  }

    async readDocs(userId, repoId) {
    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      const query = `
        SELECT docs_data 
        FROM docss 
        WHERE repo_id = $1 AND user_id = $2
        LIMIT 1;
      `;
      const { rows } = await client.query(query, [repoId, userId]);
      return rows.length ? rows[0].docs_data : null;
    } catch (error) {
      console.error('Error reading docs:', error);
      throw error;
    } finally {
      client.release();
    }
  }

    async fetchPage(pageId) {
    throw new Error('Method not implemented.');
  }  

  async createPage(pageTitle) {
    throw new Error('Method not implemented.');
  }

  async updatePage(pageId, newContent) {
    throw new Error('Method not implemented.');
  }

  async deletePage(pageId) {
    throw new Error('Method not implemented.');
  }
}

module.exports = DocsPostgresAdapter;

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
  "score": 0.30884552,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:805539bd1311c725"
}
```

---

### Chunk 4/31
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 1771 characters
- **Score**: 0.296804428
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
  "score": 0.296804428,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:a6a87f5f25105891"
}
```

---

### Chunk 5/31
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 6338 characters
- **Score**: 0.29151535
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
  "score": 0.29151535,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:9ebe3528d2dd55c2"
}
```

---

### Chunk 6/31
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 8386 characters
- **Score**: 0.279560089
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
  "score": 0.279560089,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:7372d7728f242b75"
}
```

---

### Chunk 7/31
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 1000 characters
- **Score**: 0.258424759
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
  "score": 0.258424759,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:f5f6a9819e3adf32"
}
```

---

### Chunk 8/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 4079 characters
- **Score**: 0.594291747
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
  "score": 0.594291747,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:b6a272f88a31a774"
}
```

---

### Chunk 9/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 954 characters
- **Score**: 0.548151076
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
  "score": 0.548151076,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:3e4a78a9ee92da67"
}
```

---

### Chunk 10/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 1418 characters
- **Score**: 0.510639191
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
// user.js
'use strict';

const { v4: uuidv4 } = require('uuid');

class User {
  constructor() {
    this.userId = uuidv4();
    this.roles = []; 
    this.accounts = [];
  }

  async getUserInfo(email, IAuthPersistPort) {
    try {
      const userDTO = await IAuthPersistPort.getUserInfo(email);
      console.log('User read successfully:', userDTO);
      return userDTO;
    } catch (error) {
      console.error('Error reading user:', error);
      throw error;
    }
  }

  async registerUser(username, email, password, IAuthPersistPort) {
    try {
      const newUserDTO = await IAuthPersistPort.registerUser(username, email, password);
      console.log(`New user registered successfully: ${newUserDTO}`);
      return newUserDTO;
    } catch (error) {
      console.error('Error registering new user:', error);
      throw error;
    }
  }

  async removeUser(email, IAuthPersistPort) {
    try {
      await IAuthPersistPort.removeUser(email);
      console.log('User removed successfully');
    } catch (error) {
      console.error('Error removing user:', error);
      throw error;
    }
  }

  addRole(role) {
    if (!this.roles.includes(role)) {
      this.roles.push(role);
      console.log(`Role ${role} added successfully.`);
    }
  }

  removeRole(role) {
    this.roles = this.roles.filter(r => r !== role);
    console.log(`Role ${role} removed successfully.`);
  }
}

module.exports = User;

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
  "score": 0.510639191,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:192ad79e20f5e94c"
}
```

---

### Chunk 11/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 4422 characters
- **Score**: 0.435382843
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
// authController.js
/* eslint-disable no-unused-vars */
'use strict';

const util = require('util');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const fp = require('fastify-plugin');

async function authController(fastify, options) {

  // Helper to set auth cookies uniformly
  const setAuthCookies = (reply, token) => {
    const cookieSecure = process.env.NODE_ENV === 'staging';
    const cookieSameSite = cookieSecure ? 'None' : 'Lax';
    reply.setCookie('authToken', token, {
      path: '/',
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      maxAge: 60 * 60 * 24, // 1 day
    });
  };

  // -------------------------------------------------------------------------
  
  fastify.decorate('readAllUsers', async function (request, reply) {
    try {
      const userService = await request.diScope.resolve('userService');
      const users = await userService.readAllUsers();
      return reply.send({ message: 'Users discovered!', users });
    } catch (error) {
      this.log.error('Error discovering users:', error);
      return reply.internalServerError('Internal Server Error', { cause: error });
    }
  });

    fastify.decorate('getUserInfo', async function (request, reply) {
    if (!request.user || !request.user.username) {
      throw fastify.httpErrors.unauthorized('User not authenticated');
    }
    return reply.send(request.user);
  });

  fastify.decorate('registerUser', async function (request, reply) {
    const { username, email, password } = request.body;
    try {
      const userService = await request.diScope.resolve('userService');
      const newUser = await userService.registerUser(username, email, password);
      return reply.send({ message: 'User registered successfully', user: newUser });
    } catch (error) {
      fastify.log.error('Error registering user:', error);
      return reply.internalServerError('Internal Server Error', { cause: error });
    }
  });

  fastify.decorate('removeUser', async function (request, reply) {
    const { email } = request.query;
    try {
      const userService = await request.diScope.resolve('userService');
      const user = await userService.getUserInfo(email);
      if (!user) {
        return reply.unauthorized('Invalid credentials');
      }
      await userService.removeUser(email);
      return reply.code(204).send();
    } catch (error) {
      fastify.log.error('Error removing user:', error);
      return reply.internalServerError('Internal Server Error', { cause: error });
    }
  });

  fastify.decorate('loginUser', async function (request, reply) {
    const jti = uuidv4();
    const { email, password } = request.body;
    if (!email || !password) {
      return reply.badRequest('Email and password are required');
    }
  
    try {
      const userService = await request.diScope.resolve('userService');
      const user = await userService.getUserInfo(email);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return reply.unauthorized('Invalid credentials');
      }
  
      const authToken = fastify.jwt.sign(
        { id: user.id, username: user.username, jti },
        { jwtid: jti, expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
      );
  
  // Set auth cookie for manual login
  setAuthCookies(reply, authToken);
  
      return reply.send({
        message: 'Authentication successful',
        user: { id: user.id, email: user.email, username: user.username },
      });
    } catch (error) {
      fastify.log.error('Error logging in user:', error);
      return reply.internalServerError('Internal Server Error', { cause: error });
    }
  });
  
  fastify.decorate('logoutUser', async function (request, reply) {
    reply.clearCookie('authToken', { path: '/' });
    return reply.code(204).send();
  });

  fastify.decorate('refreshToken', async function (request, reply) {
    try {
      const user = request.user || {};
      const authToken = fastify.jwt.sign(
        { id: user.id, username: user.username },
        { expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
      );
  setAuthCookies(reply, authToken);
      return reply.send({ token: authToken });
    } catch (error) {
      fastify.log.error('Error refreshing token:', error);
      return reply.internalServerError('Internal Server Error', { cause: error });
    }
  }); 
}

module.exports = fp(authController);
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
  "score": 0.435382843,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:912b67ad805b9d05"
}
```

---

### Chunk 12/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 1571 characters
- **Score**: 0.432310134
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
  "score": 0.432310134,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:4153a9a6bbfde258"
}
```

---

### Chunk 13/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 1185 characters
- **Score**: 0.42864418
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
  "score": 0.42864418,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:466416a32abaaf46"
}
```

---

### Chunk 14/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 1083 characters
- **Score**: 0.419034958
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

class Session {
  constructor(userId, IAuthInMemStoragePort) {
    this.sessionId = uuidv4();
    this.userId = userId;
    this.createdAt = new Date();
    this.IAuthInMemStoragePort = IAuthInMemStoragePort;
  }

  async setSessionInMem() {
    try {
      await this.IAuthInMemStoragePort.setSessionInMem(this.sessionId, this);
      console.log('Session set successfully in-memory!');
    } catch (error) {
      console.error('Error setting session in-memory:', error);
      throw error;
    }
  }

  async validateSession() {
    const sessionData = await this.IAuthInMemStoragePort.getSession(this.sessionId);
    const oneHour = 3600000;
    return sessionData && (new Date() - new Date(sessionData.createdAt) < oneHour);
  }

  async logout() {
    try {
      await this.IAuthInMemStoragePort.deleteSession(this.sessionId);
      console.log('Session successfully terminated.');
    } catch (error) {
      console.error('Error logging out session:', error);
      throw error;
    }
  }
}

module.exports = Session;

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
  "score": 0.419034958,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:289abd0fc9c30fb4"
}
```

---

### Chunk 15/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 434 characters
- **Score**: 0.402610809
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
  "score": 0.402610809,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:05a2fe4caa922298"
}
```

---

### Chunk 16/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 6837 characters
- **Score**: 0.395469666
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
  "score": 0.395469666,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:c57b27add1d880c1"
}
```

---

### Chunk 17/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 521 characters
- **Score**: 0.395311356
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
  "score": 0.395311356,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:8cce9c9179821b52"
}
```

---

### Chunk 18/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 653 characters
- **Score**: 0.375120193
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
  "score": 0.375120193,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:54a3f07013077594"
}
```

---

### Chunk 19/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 10143 characters
- **Score**: 0.365821838
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
  "score": 0.365821838,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:3748242fdecdbb5a"
}
```

---

### Chunk 20/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 3663 characters
- **Score**: 0.357025176
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
// authPostgresAdapter.js
'use strict';

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const IAuthPersistPort = require('../../domain/ports/IAuthPersistPort');

const isLocal = process.env.NODE_ENV !== 'staging';

class AuthPostgresAdapter extends IAuthPersistPort {
  constructor({ cloudSqlConnector }) {
    super();
    this.connector = cloudSqlConnector;

    this.poolPromise = isLocal
      ? this.createLocalPool()
      : this.createCloudSqlPool(cloudSqlConnector);
  }

  async getPool() {
    if (!this.pool) {
      this.pool = await this.poolPromise;
    }
    return this.pool;
  }

  createLocalPool() {
    const config = {
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      host: 'localhost',
      port: 5432,
    };
    return Promise.resolve(new Pool(config));
  }

  async createCloudSqlPool(connector) {
    const instanceConnectionName = process.env.CLOUD_SQL_CONNECTION_NAME;
    if (!instanceConnectionName) {
      throw new Error('❌ CLOUD_SQL_CONNECTION_NAME env var not set.');
    }

    const clientOpts = await connector.getOptions({
      instanceConnectionName,
      ipType: 'PRIVATE',
      authType: 'ADC',
    });

    const config = {
      ...clientOpts,
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
    };

    console.info('[DB] Using Cloud SQL config for:', instanceConnectionName);
    return new Pool(config);
  }

  async readAllUsers() {
    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM auth.users');
      return rows;
    } catch (error) {
      console.error('Error reading all users:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserInfo(email) {
    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM auth.users WHERE email=$1', [email]);
      return rows.length ? rows[0] : null;
    } catch (error) {
      console.error('Error reading user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async registerUser(username, email, password) {
    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      const id = uuidv4();
      const existingUser = await client.query('SELECT * FROM auth.users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        throw new Error('Email already exists');
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      await client.query(
        'INSERT INTO auth.users (id, username, email, password) VALUES ($1, $2, $3, $4)',
        [id, username, email, hashedPassword]
      );
      return { id, username, email };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async removeUser(email) {
    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      const { rows } = await client.query('SELECT id FROM auth.users WHERE email = $1', [email]);
      if (rows.length === 0) return false;
      const result = await client.query('DELETE FROM auth.users WHERE email = $1', [email]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error removing user:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = AuthPostgresAdapter;

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
  "score": 0.357025176,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:b72df36c90ee403f"
}
```

---

### Chunk 21/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 10406 characters
- **Score**: 0.352752715
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
  "score": 0.352752715,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:76ac57a41178be0a"
}
```

---

### Chunk 22/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 1236 characters
- **Score**: 0.344953537
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
// aop_modules/auth/index.js
/* eslint-disable no-unused-vars */
const autoload = require('@fastify/autoload');
const path = require('path');

// Export as raw async function without fastify-plugin wrapper
module.exports = async function authModuleIndex(fastify, opts) {

  // Register the auth plugin FIRST to ensure decorators are available
  await fastify.register(require('./authPlugin'));

  const moduleSpecificPrefix = opts.prefix ? `${opts.prefix}/${path.basename(__dirname)}` : `/${path.basename(__dirname)}`;

  // fastify.register(autoload, {
  //   dir: path.join(__dirname, 'plugins'),
  //   options: {
  //   },
  //   encapsulate: false,
  //   maxDepth: 1,
  //   matchFilter: (path) =>  path.includes('Plugin')    
  // });
  

  await fastify.register(autoload, {
    dir: path.join(__dirname, 'application'),
    encapsulate: false,
    maxDepth: 1,
    matchFilter: (filepath) => filepath.includes('Controller'), 
    prefix: moduleSpecificPrefix 
  });

  await fastify.register(autoload, {
    dir: path.join(__dirname, 'input'),
    encapsulate: false, 
    maxDepth: 1,
    matchFilter: (filepath) => filepath.includes('Router'),     
    dirNameRoutePrefix: false,
    prefix: moduleSpecificPrefix 
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
  "score": 0.344953537,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:c6b16a3841f84568"
}
```

---

### Chunk 23/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 6876 characters
- **Score**: 0.34040451
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
  "score": 0.34040451,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:4f16c127b1f4e5bd"
}
```

---

### Chunk 24/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 12115 characters
- **Score**: 0.339481384
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
  "score": 0.339481384,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:34252dea0c111df7"
}
```

---

### Chunk 25/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 254 characters
- **Score**: 0.330366135
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
class UserId {
  constructor(value) {
    if (!value || typeof value !== 'string') throw new Error('Invalid UserId');
    this.value = value;
  }
  equals(other) { return other instanceof UserId && this.value === other.value; }
}
module.exports = UserId;
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
  "score": 0.330366135,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:376e6d0b80f652dc"
}
```

---

### Chunk 26/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 4198 characters
- **Score**: 0.325454712
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
  "score": 0.325454712,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:77a1b863d9556d37"
}
```

---

### Chunk 27/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 7359 characters
- **Score**: 0.320163727
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
// authPlugin.js
'use strict';

const fp = require('fastify-plugin');
const fs = require('fs');
const fastifyJwt = require('@fastify/jwt');
const fastifyOAuth2 = require('@fastify/oauth2');
const { OAuth2Client } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid');

// Export the plugin function WITH fastify-plugin wrapper to make decorators globally available
module.exports = fp(async function authPlugin(fastify, opts) {
  const BUILDING_API_SPEC = process.env.GENERATING_HTTP_API_SPEC === '1';

  // ────────────────────────────────────────────────────────────────
  // GOOGLE OAUTH + JWT CREDENTIALS SETUP
  // ────────────────────────────────────────────────────────────────
  let credentialsJsonString, clientId, clientSecret;

  if (
    process.env.USER_OAUTH2_CREDENTIALS &&
    process.env.USER_OAUTH2_CREDENTIALS.startsWith('{') // if it looks like a JSON string
  ) {
    credentialsJsonString = JSON.parse(process.env.USER_OAUTH2_CREDENTIALS);
  } else if (fastify.secrets && typeof fastify.secrets.USER_OAUTH2_CREDENTIALS === 'string') {
    const credentialsPath = fastify.secrets.USER_OAUTH2_CREDENTIALS;
    credentialsJsonString = JSON.parse(
      await fs.promises.readFile(credentialsPath, { encoding: 'utf8' })
    );
  } else {
    clientId = process.env.FALLBACK_CLIENT_ID;
    clientSecret = process.env.FALLBACK_CLIENT_SECRET;
  }

  if (credentialsJsonString) {
    clientId = credentialsJsonString.web.client_id;
    clientSecret = credentialsJsonString.web.client_secret;
  }

  const revokedTokens = new Map();

  // ────────────────────────────────────────────────────────────────
  // JWT SETUP
  // ────────────────────────────────────────────────────────────────
  if (!BUILDING_API_SPEC) {
    await fastify.register(fastifyJwt, {
      secret: fastify.secrets.JWT_SECRET,
      sign: { expiresIn: fastify.secrets.JWT_EXPIRE_IN },
      verify: { requestProperty: 'user' },
      trusted(request, decoded) {
        return !revokedTokens.has(decoded.jti);
      },
    });
  }

  // ────────────────────────────────────────────────────────────────
  // JWT DECORATORS
  // ────────────────────────────────────────────────────────────────
  if (!BUILDING_API_SPEC) {
    fastify.decorate('verifyToken', async function (request) {
      let token = request.cookies?.authToken;
      if (!token && request.headers.authorization) {
        const [scheme, value] = request.headers.authorization.split(' ');
        if (scheme === 'Bearer') token = value;
      }
      if (!token) throw fastify.httpErrors.unauthorized('Missing token');
      
      try {
        request.user = await fastify.jwt.verify(token);
      } catch (error) {
        // Handle JWT verification errors properly
        if (error.code === 'FAST_JWT_EXPIRED') {
          throw fastify.httpErrors.unauthorized('Token has expired');
        } else if (error.code === 'FAST_JWT_INVALID_TOKEN') {
          throw fastify.httpErrors.unauthorized('Invalid token');
        } else if (error.code === 'FAST_JWT_MALFORMED_TOKEN') {
          throw fastify.httpErrors.unauthorized('Malformed token');
        } else {
          // For any other JWT-related error, return unauthorized
          throw fastify.httpErrors.unauthorized('Token verification failed');
        }
      }
    });

    fastify.decorateRequest('revokeToken', function () {
      if (!this.user?.jti) throw this.httpErrors.unauthorized('Missing jti');
      revokedTokens.set(this.user.jti, true);
    });

    fastify.decorateRequest('generateToken', async function () {
      return fastify.jwt.sign(
        { id: String(this.user.id), username: this.user.username },
        { jwtid: uuidv4(), expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
      );
    });
  } else {
    // Provide no-op versions for spec generation
    fastify.decorate('verifyToken', async function (request) {
      // No-op for spec generation
      request.user = { id: 'spec-user', username: 'spec-user' };
    });

    fastify.decorateRequest('revokeToken', function () {
      // No-op for spec generation
    });

    fastify.decorateRequest('generateToken', async function () {
      // No-op for spec generation
      return 'spec-token';
    });
  }

  // ────────────────────────────────────────────────────────────────
  // OAUTH2 SETUP
  // ────────────────────────────────────────────────────────────────
  const cookieSecure   = process.env.NODE_ENV === 'staging';
  const cookieSameSite = cookieSecure ? 'None' : 'Lax';
  const googleCallbackUri =
    cookieSecure
      ? 'https://eventstorm.me/api/auth/google/callback'
      : 'http://localhost:3000/api/auth/google/callback';

  if (!BUILDING_API_SPEC) {
    await fastify.register(
      fastifyOAuth2,
      {
        name: 'googleOAuth2',
        scope: ['profile', 'email', 'openid'],
        cookie: { secure: cookieSecure, sameSite: cookieSameSite, httpOnly: true },
        credentials: {
          client: { id: clientId, secret: clientSecret },
          auth: fastifyOAuth2.GOOGLE_CONFIGURATION,
        },
        startRedirectPath: '/api/auth/google',
        callbackUri: googleCallbackUri,
      },
      { encapsulate: false }
    );
  }

  // ────────────────────────────────────────────────────────────────
  // GOOGLE CLIENT SETUP
  // ────────────────────────────────────────────────────────────────
  if (!BUILDING_API_SPEC) {
    const googleClient = new OAuth2Client(clientId);
    fastify.decorate('verifyGoogleIdToken', async (idToken) => {
      const ticket = await googleClient.verifyIdToken({ idToken, audience: clientId });
      return ticket.getPayload();
    });
  } else {
    // Provide no-op version for spec generation
    fastify.decorate('verifyGoogleIdToken', async (idToken) => {
      return { sub: 'spec-user', email: 'spec@example.com', name: 'Spec User' };
    });
  }

  // ────────────────────────────────────────────────────────────────
  // GOOGLE OAUTH CALLBACK ROUTE
  // ────────────────────────────────────────────────────────────────
  fastify.get('/api/auth/google/callback', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          state: { type: 'string' }
        },
        additionalProperties: true
      },
      response: {
        302: {
          description: 'Redirect to frontend after successful authentication'
        }
      }
    }
  }, async (req, reply) => {
    const token            = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
    const googleAccessToken = token.token.access_token;

    const userService = await req.diScope.resolve('userService');
    const googleUser  = await userService.loginWithGoogle(googleAccessToken);
    if (!googleUser) return reply.unauthorized('Google profile invalid');

    const jti  = uuidv4();
    const jwt  = fastify.jwt.sign(
      { id: googleUser.id, username: googleUser.username, jti },
      { jwtid: jti, expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
    );

    fastify.log.info(`DEV: JWT token for user ${googleUser.id}: ${jwt}`);

    reply.setCookie('authToken', jwt, {
      path: '/',
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
    });

    reply.redirect((cookieSecure ? 'https://eventstorm.me' : 'http://localhost:5173') + '/chat');
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
  "score": 0.320163727,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:6869b6bc7fb3273d"
}
```

---

### Chunk 28/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 3142 characters
- **Score**: 0.316524506
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

module.exports = fp(async function gitRouter(fastify, opts) {
  console.log('gitRouter is loaded!');

  // fetch repository
  fastify.route({
    method: 'GET',
    url: '/repositories/:owner/:repo',
    preValidation: [fastify.verifyToken],
    handler: fastify.fetchRepo,
    schema: {
      tags: ['git'],
      params: {
        type: 'object',
        properties: {
          owner: { type: 'string', minLength: 1 },
          repo: { type: 'string', minLength: 1 }
        },
        required: ['owner', 'repo'],
        additionalProperties: false
      },
      headers: {
        type: 'object',
        properties: {
          'x-correlation-id': { type: 'string' }
        },
        additionalProperties: true
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            fullName: { type: 'string' },
            owner: { type: 'string' },
            private: { type: 'boolean' },
            description: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            // Add or adjust more fields as your repo object provides
          },
          additionalProperties: true
        }
      }
    }
  });

  // persist repository
  fastify.route({
    method: 'POST',
    url: '/repositories/:owner/:repo/persist',
    preValidation: [fastify.verifyToken],
    handler: fastify.persistRepo,
    schema: {
      tags: ['git'],
      params: {
        type: 'object',
        properties: {
          owner: { type: 'string', minLength: 1 },
          repo: { type: 'string', minLength: 1 }
        },
        required: ['owner', 'repo'],
        additionalProperties: false
      },
      headers: {
        type: 'object',
        properties: {
          'x-correlation-id': { type: 'string' }
        },
        additionalProperties: true
      },
      body: {
        type: 'object',
        properties: {
          branch: { type: 'string', default: 'main' },
          forceUpdate: { type: 'boolean', default: false },
          includeHistory: { type: 'boolean', default: true }
        },
        additionalProperties: true
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            repositoryId: { type: 'string' },
            owner: { type: 'string' },
            repo: { type: 'string' },
            branch: { type: 'string' },
            persistedAt: { type: 'string', format: 'date-time' },
            filesProcessed: { type: 'number' },
            message: { type: 'string' }
          },
          additionalProperties: true
        },
        409: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
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
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.316524506,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:c603317a5e33a005"
}
```

---

### Chunk 29/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 14508 characters
- **Score**: 0.31609726
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

const fp = require('fastify-plugin');
const fastifyWebsocket = require('@fastify/websocket');

module.exports = fp(async function websocketPlugin(fastify, opts) {
  // Helper function for consistent timestamps
  const getTimestamp = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  
  // 1️⃣ Register the WS engine
  await fastify.register(fastifyWebsocket);

  // 2️⃣ Store active connections per user with metadata
  const userConnections = new Map();
  const connectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    reconnections: 0,
    errors: 0,
    messagesProcessed: 0,
    startTime: new Date().toISOString()
  };

  // 3️⃣ Enhanced sendToUser with error handling and retry logic
  fastify.decorate('sendToUser', (userId, payload, options = {}) => {
    const { retryOnError = true, maxRetries = 3 } = options;
    const conns = userConnections.get(userId);
    
    console.log(`[${getTimestamp()}] 📡 Attempting to send message to user ${userId}:`, JSON.stringify(payload));
    
    if (!conns || conns.size === 0) {
      fastify.log.warn(`[${getTimestamp()}] No WS connections for user ${userId}`);
      return { success: false, reason: 'no_connections', userId };
    }

    const msg = JSON.stringify({
      ...payload,
      timestamp: new Date().toISOString(),
      userId // Always include userId for client-side validation
    });

    let successCount = 0;
    let failureCount = 0;
    const deadConnections = [];

    for (const connection of conns) {
      try {
        // FIX: Check connection.readyState instead of connection.socket.readyState
        if (connection.readyState === 1) { // 1 = OPEN
          connection.send(msg); // FIX: Use connection.send() instead of connection.socket.send()
          successCount++;
          connectionMetrics.messagesProcessed++;
          
          // Update last message timestamp
          connection.lastMessageSent = new Date().toISOString();
        } else if (connection.readyState === 3) { // 3 = CLOSED
          deadConnections.push(connection);
          fastify.log.debug(`[${getTimestamp()}] Removing dead connection for user ${userId}`);
        }
      } catch (error) {
        failureCount++;
        connectionMetrics.errors++;
        fastify.log.error(`[${getTimestamp()}] Failed to send message to user ${userId}:`, error.message);
        
        // Mark connection for removal if persistently failing
        if (!connection.errorCount) connection.errorCount = 0;
        connection.errorCount++;
        
        if (connection.errorCount >= maxRetries) {
          deadConnections.push(connection);
          fastify.log.warn(`[${getTimestamp()}] Removing failing connection for user ${userId} after ${maxRetries} attempts`);
        }
      }
    }

    // Clean up dead connections
    deadConnections.forEach(deadConn => {
      conns.delete(deadConn);
      connectionMetrics.activeConnections--;
    });

    // Remove user entry if no connections left
    if (conns.size === 0) {
      userConnections.delete(userId);
      fastify.log.info(`[${getTimestamp()}] Removed all connections for user ${userId}`);
    }

    return {
      success: successCount > 0,
      successCount,
      failureCount,
      totalConnections: successCount + failureCount,
      userId,
      timestamp: new Date().toISOString()
    };
  });

  // 4️⃣ Enhanced health-check and metrics
  fastify.decorate('getActiveConnections', () => {
    const connectionSummary = Array.from(userConnections.entries()).reduce((out, [id, conns]) => {
      out[id] = {
        count: conns.size,
        connections: Array.from(conns).map(conn => ({
          connectedAt: conn.connectedAt,
          lastMessageSent: conn.lastMessageSent || 'never',
          errorCount: conn.errorCount || 0,
          readyState: conn.readyState // FIX: Use conn.readyState instead of conn.socket.readyState
        }))
      };
      return out;
    }, {});

    return {
      users: connectionSummary,
      totalUsers: userConnections.size,
      metrics: connectionMetrics,
      timestamp: new Date().toISOString()
    };
  });

  // 5️⃣ Connection health monitoring
  fastify.decorate('getConnectionHealth', (userId) => {
    const conns = userConnections.get(userId);
    if (!conns) {
      return { healthy: false, reason: 'no_connections', userId };
    }

    const healthyConnections = Array.from(conns).filter(conn => 
      conn.readyState === 1 && (conn.errorCount || 0) < 3 // FIX: Use conn.readyState === 1 (OPEN)
    );

    return {
      healthy: healthyConnections.length > 0,
      totalConnections: conns.size,
      healthyConnections: healthyConnections.length,
      userId,
      timestamp: new Date().toISOString()
    };
  });

  // 6️⃣ Broadcast to all users (useful for system messages)
  fastify.decorate('broadcastToAllUsers', (payload, options = {}) => {
    const results = [];
    for (const userId of userConnections.keys()) {
      const result = fastify.sendToUser(userId, {
        ...payload,
        type: 'broadcast'
      }, options);
      results.push({ userId, ...result });
    }
    return {
      broadcast: true,
      totalUsers: results.length,
      results,
      timestamp: new Date().toISOString()
    };
  });

  // 7️⃣ Enhanced WebSocket route with comprehensive error handling
  fastify.get('/api/ws', {
  websocket: true,
  schema: {
    querystring: {
      type: 'object',
      properties: {
        userId: { type: 'string' }
      },
      additionalProperties: false
    },
    response: {
      101: {
        description: 'Switching Protocols - WebSocket connection established'
      }
    }
  }
}, (connection, req) => {
    const userId = req.query.userId || 'anonymous'; 
    const userAgent = req.headers['user-agent'] || 'unknown';
    const clientIp = req.ip || 'unknown';
    
    fastify.log.info(`[${getTimestamp()}] 🔗 WS connected for user ${userId} from ${clientIp}`);

    // Initialize connection metadata
    connection.connectedAt = new Date().toISOString();
    connection.userId = userId;
    connection.userAgent = userAgent;
    connection.clientIp = clientIp;
    connection.errorCount = 0;
    connection.messagesReceived = 0;

    // Add to user connections map
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId).add(connection);
    
    // Update metrics
    connectionMetrics.totalConnections++;
    connectionMetrics.activeConnections++;

    // Send enhanced welcome message
    const welcomeMessage = {
      type: 'connected',
      userId,
      connectionId: `${userId}_${Date.now()}`,
      serverTime: new Date().toISOString(),
      features: ['real-time-chat', 'ai-responses', 'typing-indicators'],
      version: '1.0.0'
    };

    try {
      connection.send(JSON.stringify(welcomeMessage)); // FIX: Use connection.send() instead of connection.socket.send()
      fastify.log.debug(`[${getTimestamp()}] Welcome message sent to user ${userId}`);
    } catch (error) {
      fastify.log.error(`[${getTimestamp()}] Failed to send welcome message to user ${userId}:`, error);
      connection.errorCount++;
    }

    // Enhanced cleanup function
    function teardown(reason = 'unknown') {
      try {
        const conns = userConnections.get(userId);
        if (conns) {
          conns.delete(connection);
          connectionMetrics.activeConnections--;
          
          if (conns.size === 0) {
            userConnections.delete(userId);
            fastify.log.info(`[${getTimestamp()}] All connections removed for user ${userId}`);
          }
        }
        
        fastify.log.info(`[${getTimestamp()}] 🔌 WS disconnected for user ${userId} (reason: ${reason})`);
      } catch (cleanupError) {
        fastify.log.error(`[${getTimestamp()}] Error during connection cleanup for user ${userId}:`, cleanupError);
      }
    }

    // Enhanced error handling - FIX: Use connection.on() instead of connection.socket.on()
    connection.on('error', (error) => {
      connection.errorCount++;
      connectionMetrics.errors++;
      
      fastify.log.error(`[${getTimestamp()}] WS error for user ${userId} (error #${connection.errorCount}):`, {
        message: error.message,
        code: error.code,
        userAgent: connection.userAgent,
        clientIp: connection.clientIp
      });

      // Auto-disconnect after too many errors
      if (connection.errorCount >= 5) {
        fastify.log.warn(`[${getTimestamp()}] Force disconnecting user ${userId} due to excessive errors`);
        try {
          connection.close(1011, 'Too many errors'); // FIX: Use connection.close() instead of connection.socket.close()
        } catch (closeError) {
          fastify.log.error(`[${getTimestamp()}] Error force-closing connection:`, closeError);
        }
      }
      
      teardown(`error_${error.code || 'unknown'}`);
    });

    // Enhanced close handling - FIX: Use connection.on() instead of connection.socket.on()
    connection.on('close', (code, reason) => {
      const closeReason = reason ? reason.toString() : 'no_reason';
      fastify.log.info(`[${getTimestamp()}] WS closed for user ${userId} (code: ${code}, reason: ${closeReason})`);
      teardown(`close_${code}`);
    });

    // Enhanced message handling with error recovery - FIX: Use connection.on() instead of connection.socket.on()
    connection.on('message', (data) => {
      try {
        connection.messagesReceived++;
        
        let msg;
        try {
          msg = JSON.parse(data.toString());
        } catch (parseError) {
          fastify.log.error(`[${getTimestamp()}] Invalid JSON from user ${userId}:`, parseError.message);
          
          // Send error response to client
          connection.send(JSON.stringify({ // FIX: Use connection.send() instead of connection.socket.send()
            type: 'error',
            error: 'Invalid JSON format',
            timestamp: new Date().toISOString()
          }));
          return;
        }

        fastify.log.debug(`[${getTimestamp()}] WS message from user ${userId}:`, msg);

        // Handle different message types
        switch (msg.type) {
          case 'ping':
            connection.send(JSON.stringify({ // FIX: Use connection.send() instead of connection.socket.send()
              type: 'pong',
              timestamp: new Date().toISOString()
            }));
            break;
            
          case 'heartbeat':
            connection.lastHeartbeat = new Date().toISOString();
            connection.send(JSON.stringify({ // FIX: Use connection.send() instead of connection.socket.send()
              type: 'heartbeat_ack',
              timestamp: new Date().toISOString()
            }));
            break;
            
          case 'typing':
            // Broadcast typing indicator to other users in the conversation
            if (msg.conversationId) {
              // This could be enhanced to broadcast to specific conversation participants
              fastify.log.debug(`[${getTimestamp()}] User ${userId} typing in conversation ${msg.conversationId}`);
            }
            break;
            
          default:
            fastify.log.debug(`[${getTimestamp()}] Unknown message type '${msg.type}' from user ${userId}`);
        }

      } catch (messageError) {
        connection.errorCount++;
        fastify.log.error(`[${getTimestamp()}] Error processing message from user ${userId}:`, messageError);
        
        try {
          connection.send(JSON.stringify({ // FIX: Use connection.send() instead of connection.socket.send()
            type: 'error',
            error: 'Failed to process message',
            timestamp: new Date().toISOString()
          }));
        } catch (sendError) {
          fastify.log.error(`[${getTimestamp()}] Failed to send error response to user ${userId}:`, sendError);
        }
      }
    });

    // Periodic connection health check
    const healthCheckInterval = setInterval(() => {
      if (connection.readyState !== 1) { // FIX: Check connection.readyState instead of connection.socket.readyState, 1 = OPEN
        clearInterval(healthCheckInterval);
        teardown('health_check_failed');
        return;
      }

      // Send periodic ping to detect dead connections
      try {
        connection.send(JSON.stringify({ // FIX: Use connection.send() instead of connection.socket.send()
          type: 'ping',
          timestamp: new Date().toISOString()
        }));
      } catch (pingError) {
        fastify.log.error(`[${getTimestamp()}] Health check ping failed for user ${userId}:`, pingError);
        clearInterval(healthCheckInterval);
        teardown('ping_failed');
      }
    }, 30000); // Ping every 30 seconds

    // Cleanup interval on connection close - FIX: Use connection.on() instead of connection.socket.on()
    connection.on('close', () => {
      clearInterval(healthCheckInterval);
    });
  });

  // 8️⃣ Graceful shutdown handling
  fastify.addHook('onClose', async () => {
    fastify.log.info(`[${getTimestamp()}] Shutting down WebSocket plugin, closing ${connectionMetrics.activeConnections} active connections...`);
    
    // Notify all connected users about shutdown
    const shutdownMessage = {
      type: 'server_shutdown',
      message: 'Server is shutting down. Please reconnect in a few moments.',
      timestamp: new Date().toISOString()
    };

    for (const [userId, connections] of userConnections.entries()) {
      for (const connection of connections) {
        try {
          if (connection.readyState === 1) { // FIX: Check connection.readyState instead of connection.socket.readyState, 1 = OPEN
            connection.send(JSON.stringify(shutdownMessage)); // FIX: Use connection.send() instead of connection.socket.send()
            connection.close(1001, 'Server shutdown'); // FIX: Use connection.close() instead of connection.socket.close()
          }
        } catch (error) {
          fastify.log.error(`[${getTimestamp()}] Error closing connection for user ${userId}:`, error);
        }
      }
    }

    // Clear all connections
    userConnections.clear();
    connectionMetrics.activeConnections = 0;
    
    fastify.log.info(`[${getTimestamp()}] WebSocket plugin shutdown complete`);
  });

  fastify.log.info(`[${getTimestamp()}] ✅ WebSocket plugin initialized with enhanced error handling for anatolyZader`);
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
  "score": 0.31609726,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:d34dd65ab992bb88"
}
```

---

### Chunk 30/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 6250 characters
- **Score**: 0.310014695
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
// gitController.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function gitController(fastify, options) {


fastify.decorate('fetchRepo', async (request, reply) => {
    try {
      const { owner, repo } = request.params;
      const userId = request.user.id;
      const headerValue = request.headers['x-correlation-id'];
      const correlationId = (
        typeof headerValue === 'string' && headerValue.trim()
      )
      ? headerValue
      : `http-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      fastify.log.info(`Processing fetchRepo HTTP request for user: ${userId}, owner: ${owner}, repo: ${repo}`);
      
      // Check if diScope exists
      if (!request.diScope) {
        fastify.log.error('diScope not found in request object');
        throw new Error('Dependency injection scope not available');
      }

      fastify.log.info('Attempting to resolve gitService from DI container...');
      const gitService = await request.diScope.resolve('gitService');
      
      if (!gitService) {
        fastify.log.error('Git service not found in DI container');
        throw new Error('Git service not found in DI container');
      }

      fastify.log.info('gitService resolved successfully');

      const repoInGithubFormat = repo.includes('/') ? repo : `${owner}/${repo}`;
      fastify.log.info(`Calling gitService.fetchRepo with: userId=${userId}, repo=${repoInGithubFormat}, correlationId=${correlationId}`);
      
      try {
        const repository = await gitService.fetchRepo(userId, repoInGithubFormat, correlationId);
        fastify.log.info(`Repository fetched successfully`);
        return repository;
      } catch (serviceError) {
        fastify.log.error('Error from gitService.fetchRepo:', {
          message: serviceError.message,
          stack: serviceError.stack,
          name: serviceError.name,
          code: serviceError.code,
          status: serviceError.status,
          statusCode: serviceError.statusCode
        });
        throw serviceError;
      }
      
    } catch (error) {
      fastify.log.error('Error in fetchRepo controller:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        status: error.status,
        statusCode: error.statusCode,
        cause: error.cause
      });
      throw fastify.httpErrors.internalServerError('Failed to fetch repository', { cause: error });
    }
  });

  fastify.decorate('fetchDocs', async (request, reply) => {
    try {
      const { repoId } = request.query;
      const userId = request.user.id; // Assuming user is set by verifyToken middleware
      const headerValue = request.headers['x-correlation-id'];
      const correlationId = (
        typeof headerValue === 'string' && headerValue.trim()
      )
    ? headerValue
    : `http-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      fastify.log.info(`Processing fetchDocs HTTP request for user: ${userId}, repo: ${repoId}`);
      
      const gitService = await request.diScope.resolve('gitService');
      if (!gitService) {
        throw new Error('Git service not found in DI container');
      }
      
      const docs = await gitService.fetchDocs(userId, repoId, correlationId);
      
      fastify.log.info(`Docs fetched via HTTP: ${JSON.stringify(docs)}`);
      return docs;
    } catch (error) {
      fastify.log.error('Error fetching docs:', error);
      throw fastify.httpErrors.internalServerError('Failed to fetch docs', { cause: error });
    }
  });

  fastify.decorate('persistRepo', async (request, reply) => {
    try {
      const { owner, repo } = request.params;
      const { branch = 'main', forceUpdate = false, includeHistory = true } = request.body || {};
      const userId = request.user.id;
      const headerValue = request.headers['x-correlation-id'];
      const correlationId = (
        typeof headerValue === 'string' && headerValue.trim()
      )
      ? headerValue
      : `http-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      fastify.log.info(`Processing persistRepo HTTP request for user: ${userId}, owner: ${owner}, repo: ${repo}, branch: ${branch}`);
      
      // Check if diScope exists
      if (!request.diScope) {
        fastify.log.error('diScope not found in request object');
        throw new Error('Dependency injection scope not available');
      }

      fastify.log.info('Attempting to resolve gitService from DI container...');
      const gitService = await request.diScope.resolve('gitService');
      
      if (!gitService) {
        fastify.log.error('Git service not found in DI container');
        throw new Error('Git service not found in DI container');
      }

      fastify.log.info('gitService resolved successfully');

      const repoInGithubFormat = repo.includes('/') ? repo : `${owner}/${repo}`;
      fastify.log.info(`Calling gitService.persistRepo with: userId=${userId}, repo=${repoInGithubFormat}, branch=${branch}, forceUpdate=${forceUpdate}, correlationId=${correlationId}`);
      
      try {
        const result = await gitService.persistRepo(userId, repoInGithubFormat, branch, { forceUpdate, includeHistory, correlationId });
        fastify.log.info(`Repository persisted successfully: ${JSON.stringify(result)}`);
        return result;
      } catch (serviceError) {
        fastify.log.error('Error from gitService.persistRepo:', {
          message: serviceError.message,
          stack: serviceError.stack,
          name: serviceError.name,
          code: serviceError.code,
          status: serviceError.status,
          statusCode: serviceError.statusCode
        });
        throw serviceError;
      }
      
    } catch (error) {
      fastify.log.error('Error in persistRepo controller:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        status: error.status,
        statusCode: error.statusCode,
        cause: error.cause
      });
      throw fastify.httpErrors.internalServerError('Failed to persist repository', { cause: error });
    }
  });
}

module.exports = fp(gitController);
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
  "score": 0.310014695,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:347122810a1acb28"
}
```

---

### Chunk 31/31
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 8826 characters
- **Score**: 0.28899765
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
  "score": 0.28899765,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:338334d4716a49e5"
}
```

---


## 🤖 AI Response Analysis

### Generated Response:
**Status**: ✅ Generated Successfully
**Response Length**: 635 characters
**Generated At**: 2025-11-03T15:41:42.864Z

### Response Content:
```markdown
Based on the actual code provided, the `userService.js` file contains the following methods:

- `loginWithGoogle(accessToken)`: Implements OAuth2 Google authentication
- `readAllUsers()`: Retrieves all users from the persistence layer
- `registerUser(username, email, password)`: Creates a new user account
- `removeUser(email)`: Deletes a user by email
- `getUserInfo(email)`: Fetches user details by email

The `userService.js` file is the concrete implementation of the `IUserService` interface, which defines the contract for user services. The `IUserService` interface is provided in a separate file, `interfaces/IUserService.js`.
```

### Response Quality Assessment:
- **Relevance to Query**: MEDIUM - Partially addresses query
- **Use of Context**: MEDIUM - Implicit context usage
- **Response Completeness**: GOOD - Structured with adequate detail

### Key Response Elements:
- **Bullet Points**: 5 bullet items
- **File References**: 3 specific files mentioned

---


## 📈 Performance Metrics

### Search Efficiency:
- **Query Processing Time**: 5418ms
- **Documents Retrieved**: 31
- **Unique Sources**: 1
- **Average Raw Chunk Size**: 4768 characters (original)
- **Average Formatted Chunk Size**: 1365 characters (sent to LLM)

### Context Quality:
- **Relevance Score**: HIGH (31 relevant chunks found)
- **Diversity Score**: LOW (1 unique sources)
- **Raw Content Size**: 147,816 characters (retrieved from vector DB)
- **Formatted Context Size**: 42,302 characters (actually sent to LLM)
- **Context Efficiency**: 29% (lower = more truncation/formatting overhead)

### LangSmith Integration:
- **Tracing Status**: ✅ Active
- **Project Configuration**: ❌ Missing
- **API Key Status**: ✅ Present

## 🔍 Source Analysis

### Most Frequent Sources:
- **anatolyZader/vc-3**: 31 chunks

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
- **Raw Content Retrieved**: 147,816 characters from vector database
- **Formatted Context Sent**: 42,302 characters to LLM
- **Context Efficiency**: 29% (truncation applied)
- **Response Quality**: Comprehensive

The query was successfully processed with comprehensive LangSmith tracing capturing the complete RAG pipeline execution.

---
**Generated**: 2025-11-03T15:41:42.865Z  
**LangSmith Project**: eventstorm-trace  
**Trace Type**: Comprehensive RAG Analysis
**Auto-Generated**: true
