---
**ARCHIVED TRACE ANALYSIS**
- Archived on: 2025-11-05T15:11:36.427Z
- Triggered by query: "list all methods from aiPostgresAdapter.js"
- Original file: latest-trace-analysis.md
---

# LangSmith RAG Trace Analysis - 11/5/2025, 12:03:27 PM

## 🔍 Query Details
- **Query**: "explain how authPostgresAdapter.js works, list all methods from the file"
- **User ID**: d41402df-182a-41ec-8f05-153118bf2718
- **Conversation ID**: 7c5fa772-4604-4735-a1b6-9ff024645c9d
- **Started**: 2025-11-05T12:03:27.706Z
- **Completed**: 2025-11-05T12:03:33.818Z
- **Total Duration**: 6112ms

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
1. **initialization** (2025-11-05T12:03:27.707Z) - success
2. **vector_store_check** (2025-11-05T12:03:27.707Z) - success
3. **vector_search** (2025-11-05T12:03:30.984Z) - success - Found 31 documents
4. **text_search** (2025-11-05T12:03:30.990Z) - success
5. **hybrid_search_combination** (2025-11-05T12:03:30.990Z) - success
6. **context_building** (2025-11-05T12:03:30.991Z) - success - Context: 42957 chars
7. **response_generation** (2025-11-05T12:03:33.818Z) - success - Response: 810 chars

## 📊 Vector Search Analysis

### Search Configuration:
- **Vector Store**: primary
- **Search Strategy**: intelligent_strategy_with_filters
- **Documents Retrieved**: 31
- **Raw Content Size**: 178,492 characters (original chunks)
- **Formatted Context Size**: 42,957 characters (sent to LLM)
- **Compression Ratio**: 24% (due to truncation + formatting overhead)

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
- **Size**: 3119 characters
- **Score**: 0.638998032
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
  "score": 0.638998032,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:805539bd1311c725"
}
```

---

### Chunk 2/31
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 1000 characters
- **Score**: 0.439905167
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
  "score": 0.439905167,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:f5f6a9819e3adf32"
}
```

---

### Chunk 3/31
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 235 characters
- **Score**: 0.4193964
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
// aiGithubDocsAdapter.js
'use strict';
/* eslint-disable no-unused-vars */

class AIGithubDocsAdapter {
  async fetchDocs(userId, repoId) {
  console.log("fetching docs via docs module");
  }

}

module.exports = AIGithubDocsAdapter;

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
  "score": 0.4193964,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:8f50d3a7ce376026"
}
```

---

### Chunk 4/31
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 8386 characters
- **Score**: 0.387931824
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
  "score": 0.387931824,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:7372d7728f242b75"
}
```

---

### Chunk 5/31
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 5324 characters
- **Score**: 0.361831665
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
  "score": 0.361831665,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:7498c4d3da949337"
}
```

---

### Chunk 6/31
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 6338 characters
- **Score**: 0.346340179
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
  "score": 0.346340179,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:9ebe3528d2dd55c2"
}
```

---

### Chunk 7/31
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 1771 characters
- **Score**: 0.319202423
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
  "score": 0.319202423,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:a6a87f5f25105891"
}
```

---

### Chunk 8/31
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 9745 characters
- **Score**: 0.296929359
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
  "score": 0.296929359,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:837b8a6d03d2443b"
}
```

---

### Chunk 9/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 3663 characters
- **Score**: 0.688598633
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
  "score": 0.688598633,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:b72df36c90ee403f"
}
```

---

### Chunk 10/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 5764 characters
- **Score**: 0.600069106
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
// gitPostgresAdapter.js
'use strict';

const { Pool } = require('pg');
const IGitPersistPort = require('../../domain/ports/IGitPersistPort');

const isLocal = process.env.NODE_ENV !== 'staging';

class GitPostgresAdapter extends IGitPersistPort {
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

  // ✅ Fixed method name and added git schema
  async persistRepo(userId, repoId, repo) {    
    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      console.log(`[DB] Attempting to persist repo: ${repoId} for user: ${userId}`);
      
      const query = `
        INSERT INTO git.repositories (user_id, repo_id, data, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id, repo_id) 
        DO UPDATE SET data = $3, updated_at = NOW()
      `;
      
      // Ensure repo is a JSON object
      const jsonData = JSON.stringify(repo);
      console.log(`[DB] Query: ${query}`);
      console.log(`[DB] Parameters: userId=${userId}, repoId=${repoId}, dataLength=${jsonData.length}`);
      
      const result = await client.query(query, [userId, repoId, jsonData]);
      console.log(`[DB] ✅ Repository persisted successfully: ${repoId} for user: ${userId}`);
      console.log(`[DB] Query result:`, result.rowCount, 'rows affected');
      
    } catch (error) {
      console.error(`[DB] ❌ Error persisting repo:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position,
        severity: error.severity,
        userId,
        repoId,
        stack: error.stack
      });
      throw error;
    } finally {
      client.release();
    }
  }

  // ✅ Fixed method name and added git schema  
  async persistDocs(userId, repoId, docs) {
    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      console.log(`[DB] Attempting to persist docs: ${repoId} for user: ${userId}`);
      
      const query = `
        INSERT INTO git.docss (user_id, repo_id, data, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id, repo_id)
        DO UPDATE SET data = $3, updated_at = NOW()
      `;
      
      console.log(`[DB] Query: ${query}`);
      console.log(`[DB] Parameters: userId=${userId}, repoId=${repoId}, docsSize=${docs ? docs.length : 'null'}`);
      
      const result = await client.query(query, [userId, repoId, docs]);
      console.log(`[DB] ✅ Docs persisted successfully: ${repoId} for user: ${userId}`);
      console.log(`[DB] Query result:`, result.rowCount, 'rows affected');
      
    } catch (error) {
      console.error(`[DB] ❌ Error persisting docs:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position,
        severity: error.severity,
        userId,
        repoId,
        stack: error.stack
      });
      throw error;
    } finally {
      client.release();
    }
  }

  // ✅ Get repository for existence checking (used by persistRepo)
  async getRepo(userId, repoId) {
    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      console.log(`[DB] Attempting to get repo: ${repoId} for user: ${userId}`);
      
      const query = `
        SELECT user_id, repo_id, data, created_at, updated_at
        FROM git.repositories 
        WHERE user_id = $1 AND repo_id = $2
      `;
      
      console.log(`[DB] Query: ${query}`);
      console.log(`[DB] Parameters: userId=${userId}, repoId=${repoId}`);
      
      const result = await client.query(query, [userId, repoId]);
      
      if (result.rows.length === 0) {
        console.log(`[DB] ℹ️ Repository not found: ${repoId} for user: ${userId}`);
        throw new Error(`Repository ${repoId} does not exist for user ${userId}`);
      }
      
      console.log(`[DB] ✅ Repository found: ${repoId} for user: ${userId}`);
      return result.rows[0];
      
    } catch (error) {
      if (error.message.includes('does not exist')) {
        // Re-throw "not found" errors for service layer handling
        throw error;
      }
      
      console.error(`[DB] ❌ Error getting repo:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position,
        severity: error.severity,
        userId,
        repoId,
        stack: error.stack
      });
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = GitPostgresAdapter;
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
  "score": 0.600069106,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:dbc8bb8904c1d14c"
}
```

---

### Chunk 11/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 12397 characters
- **Score**: 0.56149292
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
// aiPostgresAdapter.js
'use strict';
const { Pool } = require('pg');
const IAIPersistPort = require('../../domain/ports/IAIPersistPort');

const isLocal = process.env.NODE_ENV !== 'staging';

class AIPostgresAdapter extends IAIPersistPort {
  constructor({ cloudSqlConnector }) {
      super();
      this.connector = cloudSqlConnector;
      this.pool = null;
      this.poolPromise = null;
  }

  async initPool() {
    try {
      // Ensure a pool and promise exist
      const pool = await this.getPool();
      this.pool = pool;
      console.log('✅ Database pool initialized successfully');
      return this.pool;
    } catch (error) {
      console.error('❌ Error initializing database pool:', error);
      throw error;
    }
  }

  async getPool() {
    if (this.pool) return this.pool;
    try {
      if (!this.poolPromise) {
        this.poolPromise = isLocal
          ? Promise.resolve(this.createLocalPool())
          : this.createCloudSqlPool(this.connector);
      }
      this.pool = await this.poolPromise;
      return this.pool;
    } catch (error) {
      console.error('❌ Failed to get pool:', error);
      throw new Error(`Database connection error: ${error.message}`);
    }
  }

  createLocalPool() {
    const config = {
      host: process.env.PG_HOST || '127.0.0.1',
      port: Number(process.env.PG_PORT || 5432),
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };
    console.info('[DB] Using local Postgres config (AI) host:', config.host, 'db:', config.database);
    return new Pool(config);
  }

  async createCloudSqlPool(connector) {
      try {
          const instanceConnectionName = process.env.CLOUD_SQL_CONNECTION_NAME;
          if (!instanceConnectionName) {
              throw new Error('❌ CLOUD_SQL_CONNECTION_NAME environment variable is not set. Cannot connect to Cloud SQL.');
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

          console.info('[DB] Using Cloud SQL config (AI) for:', instanceConnectionName);
          return new Pool(config);
      } catch (error) {
          console.error('❌ Error creating Cloud SQL pool:', error);
          throw error;
      }
  }

  async saveGitData(userId, repoId, content) {
    try {
      const pool = await this.getPool(); // Get initialized pool
      const client = await pool.connect();
      try {
        const query = `
          INSERT INTO git_data (user_id, repo_id, content)
          VALUES ($1, $2, $3)
          RETURNING id;
        `;
        const values = [userId, repoId, content];
        const result = await client.query(query, values);
        console.log(`Git data stored with ID: ${result.rows[0].id}`);
        return result.rows[0].id;
      } catch (error) {
        console.error('Error saving Git data:', error);
        throw error;
      } finally {
        client.release();
      }
    } catch (poolError) {
      console.error('Database connection error in saveGitData:', poolError);
      // Return a default value instead of throwing
      return null;
    }
  }

  // Save Docs data
  async saveDocsData(userId, repoId, content) {
    try {
      const pool = await this.getPool(); // Get initialized pool
      const client = await pool.connect();
      try {
        const query = `
          INSERT INTO docs_data (user_id, repo_id, content)
          VALUES ($1, $2, $3)
          RETURNING id;
        `;
        const values = [userId, repoId, content];
        const result = await client.query(query, values);
        console.log(`Docs data stored with ID: ${result.rows[0].id}`);
        return result.rows[0].id;
      } catch (error) {
        console.error('Error saving Docs data:', error);
        throw error;
      } finally {
        client.release();
      }
    } catch (poolError) {
      console.error('Database connection error in saveDocsData:', poolError);
      // Return a default value instead of throwing
      return null;
    }
  }

  // Save AI-generated response
  async saveAiResponse({ userId, conversationId, repoId, prompt, response }) {
    try {
      const pool = await this.getPool(); // Get initialized pool
      const client = await pool.connect();
      try {
        const query = `
          INSERT INTO ai.ai_responses (user_id, conversation_id, repo_id, prompt, response)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id;
        `;
        const values = [userId, conversationId, repoId, prompt, response];
        const result = await client.query(query, values);
        console.log(`AI response stored with ID: ${result.rows[0].id}`);
        return result.rows[0].id;
      } catch (error) {
        console.error('Error saving AI response:', error);
        throw error;
      } finally {
        client.release();
      }
    } catch (poolError) {
      console.error('Database connection error in saveAiResponse:', poolError);
      // Return a default value instead of throwing
      return null;
    }
  }

  // Retrieve AI responses for a conversation
  async getAiResponses(conversationId) {
    try {
      const pool = await this.getPool(); // Get initialized pool
      const client = await pool.connect();
      try {
        const query = `SELECT * FROM ai.ai_responses WHERE conversation_id = $1 ORDER BY created_at DESC;`;
        const result = await client.query(query, [conversationId]);
        return result.rows;
      } catch (error) {
        console.error('Error retrieving AI responses:', error);
        throw error;
      } finally {
        client.release();
      }
    } catch (poolError) {
      console.error('Database connection error in getAiResponses:', poolError);
      // Return empty array instead of throwing
      return [];
    }
  }

  // Retrieve conversation history for context (ordered chronologically)
  async getConversationHistory(conversationId, limit = 10) {
    try {
      const pool = await this.getPool(); // Get initialized pool
      const client = await pool.connect();
      try {
        const query = `
          SELECT prompt, response, created_at 
          FROM ai.ai_responses 
          WHERE conversation_id = $1 
          ORDER BY created_at ASC 
          LIMIT $2;
        `;
        const result = await client.query(query, [conversationId, limit]);
        return result.rows.map(row => ({
          prompt: row.prompt,
          response: row.response,
          timestamp: row.created_at
        }));
      } catch (error) {
        console.error('Error retrieving conversation history:', error);
        throw error;
      } finally {
        client.release();
      }
    } catch (poolError) {
      console.error('Database connection error in getConversationHistory:', poolError);
      // Return empty array instead of throwing
      return [];
    }
  }

  /**
   * Store document chunks to repo_data table for full-text search
   * SYNCHRONIZED CHUNKING: Stores the same chunks as Pinecone with rich metadata
   * @param {Array} chunks - Array of document chunks with pageContent and metadata
   * @param {string} userId - User ID who owns the repository
   * @param {string} repoId - Repository ID
   * @param {object} options - Storage options
   * @returns {object} Result with counts of stored chunks
   */
  async storeRepoChunks(chunks, userId, repoId, options = {}) {
    if (!chunks || chunks.length === 0) {
      console.warn('No chunks provided to store');
      return { success: true, stored: 0, skipped: 0 };
    }

    const { includeMetadata = true } = options;

    try {
      const pool = await this.getPool();
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        let stored = 0;
        let skipped = 0;
        let updated = 0;

        for (const chunk of chunks) {
          try {
            const filePath = chunk.metadata?.source || chunk.metadata?.filePath || 'unknown';
            const content = chunk.pageContent || '';
            
            // Skip empty content
            if (!content || content.trim().length === 0) {
              skipped++;
              continue;
            }

            // Extract chunk index (default to 0 for non-chunked files)
            const chunkIndex = chunk.metadata?.chunkIndex ?? 0;
            
            // Extract file extension
            const fileExtension = filePath.split('.').pop() || 'unknown';
            
            // Estimate token count (rough: 1 token ≈ 4 characters)
            const chunkTokens = chunk.metadata?.chunkTokens || Math.ceil(content.length / 4);

            // Build rich metadata object matching Pinecone structure
            const metadata = includeMetadata ? {
              semantic_tags: chunk.metadata?.semantic_tags || chunk.metadata?.semanticTags || [],
              ubiquitous_language: chunk.metadata?.ubiquitous_language || chunk.metadata?.ubiquitousLanguage || [],
              domain_concepts: chunk.metadata?.domain_concepts || chunk.metadata?.domainConcepts || [],
              function_names: chunk.metadata?.function_names || chunk.metadata?.functionNames || [],
              class_names: chunk.metadata?.class_names || chunk.metadata?.classNames || [],
              type: chunk.metadata?.type || 'github-code',
              branch: chunk.metadata?.branch || 'main',
              commit_sha: chunk.metadata?.commit_sha || chunk.metadata?.sha || null,
              processed_at: chunk.metadata?.processedAt || new Date().toISOString(),
              repo_url: chunk.metadata?.repoUrl || chunk.metadata?.repository || null,
              file_type: chunk.metadata?.fileType || fileExtension,
              // Preserve any additional metadata
              ...(chunk.metadata?.additionalMetadata || {})
            } : {};

            // Insert or update chunk with UPSERT
            const query = `
              INSERT INTO ai.repo_data (
                user_id,
                repo_id,
                file_path,
                file_extension,
                chunk_index,
                chunk_content,
                chunk_tokens,
                metadata,
                language
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT (user_id, repo_id, file_path, chunk_index) 
              DO UPDATE SET
                chunk_content = EXCLUDED.chunk_content,
                chunk_tokens = EXCLUDED.chunk_tokens,
                metadata = EXCLUDED.metadata,
                file_extension = EXCLUDED.file_extension,
                updated_at = CURRENT_TIMESTAMP
              RETURNING (xmax = 0) AS inserted;
            `;

            const result = await client.query(query, [
              userId,
              repoId,
              filePath,
              fileExtension,
              chunkIndex,
              content,
              chunkTokens,
              JSON.stringify(metadata),
              'english'
            ]);

            if (result.rows[0].inserted) {
              stored++;
            } else {
              updated++;
            }

          } catch (chunkError) {
            console.error(`Error storing chunk for file ${chunk.metadata?.source} [chunk ${chunk.metadata?.chunkIndex || 0}]:`, chunkError.message);
            skipped++;
          }
        }

        await client.query('COMMIT');
        
        console.log(`✅ PostgreSQL sync: ${stored} new, ${updated} updated, ${skipped} skipped (total: ${chunks.length})`);
        
        return {
          success: true,
          stored,
          updated,
          skipped,
          total: chunks.length
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error storing chunks to PostgreSQL:', error);
      throw new Error(`Failed to store chunks: ${error.message}`);
    }
  }
}

module.exports = AIPostgresAdapter;
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
  "score": 0.56149292,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:fc08470e4d32c030"
}
```

---

### Chunk 12/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 3829 characters
- **Score**: 0.454453468
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
// gitPubsubAdapter.js
'use strict';

class GitPubsubAdapter {
  constructor({ pubSubClient }) {
    this.pubSubClient = pubSubClient;
    this.topicName = process.env.PUBSUB_GIT_EVENTS_TOPIC_NAME || 'git-topic';
  }

  async publishRepoFetchedEvent(result, correlationId) {
    const event = {
      event: 'repositoryFetched',
      correlationId, // Include correlationId directly in the event payload
      ...result
    };
    const dataBuffer = Buffer.from(JSON.stringify(event));
    try {
      // Use the injected client instance to get the topic
      const topic = this.pubSubClient.topic(this.topicName);
      const messageId = await topic.publishMessage({ data: dataBuffer });
      console.log(`Published 'repositoryFetched' event with message ID: ${messageId} to topic: ${this.topicName}`);
      return messageId;
    } catch (error) {
      console.error(`Error publishing 'repositoryFetched' event to topic ${this.topicName}:`, error);
      throw error;
    }
  }

  async publishDocsFetchedEvent(result, correlationId) {
    const event = {
      event: 'docsFetched',
      correlationId, // Include correlationId directly in the event payload
      ...result
    };
    const dataBuffer = Buffer.from(JSON.stringify(event));
    try {
      // Use the injected client instance to get the topic
      const topic = this.pubSubClient.topic(this.topicName);
      const messageId = await topic.publishMessage({ data: dataBuffer });
      console.log(`Published 'docsFetched' event with message ID: ${messageId} to topic: ${this.topicName}`);
      return messageId;
    } catch (error) {
      console.error(`Error publishing 'docsFetched' event to topic ${this.topicName}:`, error);
      throw error;
    }
  }

  async publishRepoPersistedEvent(event, correlationId) {
    // DUAL-PATH ARCHITECTURE:
    // Path 1: GitHubb Actions publishes repoPushed events directly (primary)
    // Path 2: Git API persist endpoint also publishes (fallback for manual triggers)
    // Both use the same payload format for consistency
    
    const [owner, name] = event.repoId.split('/');
    
    // Payload format matches GitHub Actions workflow (deploy.yml)
    // This ensures AI module receives consistent data from both sources
    const eventPayload = {
      event: 'repoPushed',
      eventType: 'repoPushed',
      correlationId,
      userId: event.userId,
      repoId: event.repoId,
      repoData: {
        // CRITICAL: AI module's ContextPipeline validates these fields
        url: `https://github.com/${event.repoId}`,
        branch: event.branch || 'main',
        githubOwner: owner,
        repoName: name,
        // Optional metadata enrichment from GitHub API response
        description: event.repo?.repository?.description,
        defaultBranch: event.repo?.repository?.default_branch,
        language: event.repo?.repository?.language,
        stargazersCount: event.repo?.repository?.stargazers_count,
        forksCount: event.repo?.repository?.forks_count,
        updatedAt: event.repo?.repository?.updated_at,
        source: 'git-module-api'
      },
      timestamp: event.timestamp || new Date().toISOString()
    };
    const dataBuffer = Buffer.from(JSON.stringify(eventPayload));
    try {
      const topic = this.pubSubClient.topic(this.topicName);
      const messageId = await topic.publishMessage({ data: dataBuffer });
      console.log(`✅ Published 'repoPushed' event (from repoPersisted) with message ID: ${messageId} to topic: ${this.topicName}`);
      console.log(`📋 Event payload: userId=${event.userId}, repoId=${event.repoId}, branch=${event.branch}`);
      return messageId;
    } catch (error) {
      console.error(`❌ Error publishing 'repoPushed' event to topic ${this.topicName}:`, error);
      throw error;
    }
  }
}

module.exports = GitPubsubAdapter;
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
  "score": 0.454453468,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:a355675cfa68a9ed"
}
```

---

### Chunk 13/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 3784 characters
- **Score**: 0.448795319
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
/* eslint-disable no-console */
/* eslint-disable no-unused-vars */
'use strict';
const { Octokit } = require('@octokit/rest');
const IGitPort = require('../../domain/ports/IGitPort');

class GitGithubAdapter extends IGitPort {
  constructor() {
    super();
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error('Missing GITHUB_TOKEN');
    this.octokit = new Octokit({ auth: token });
  }

  async fetchRepo(userId, repoId) {
    console.log(`=== GitGithubAdapter.fetchRepo called ===`);
    console.log(`Parameters: userId=${userId}, repoId=${repoId}`);
    console.log(`Github token present: ${process.env.GITHUB_TOKEN ? 'YES' : 'NO'}`);
    
    const parts = repoId.split('/');
    if (parts.length !== 2) {
      throw new Error(`Invalid repoId format "${repoId}", expected "owner/repo"`);
    }
    const [owner, repo] = parts;
    console.log(`Parsed owner: ${owner}, repo: ${repo}`);
    
    try {
      console.log('Step 1: Fetching repository metadata...');
      
      // 1. Fetch repository details
      const repoResponse = await this.octokit.rest.repos.get({
        owner,
        repo,
        headers: {
          accept: 'application/vnd.github+json'
        }
      });

      console.log(`Repository response received. Status: ${repoResponse.status}`);
      console.log(`Default branch: ${repoResponse.data.default_branch}`);

      const defaultBranch = repoResponse.data.default_branch;

      console.log('Step 2: Fetching branch details...');

      // 2. Fetch the default branch details
      const branchResponse = await this.octokit.rest.repos.getBranch({
        owner,
        repo,
        branch: defaultBranch,
        headers: {
          accept: 'application/vnd.github+json'
        }
      });

      console.log('Step 3: Fetching repository tree (file structure)...');

      // 3. Fetch the complete file tree
      const treeResponse = await this.octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: branchResponse.data.commit.sha,
        recursive: 1 // Get all files recursively
      });

      console.log(`Tree fetched: ${treeResponse.data.tree.length} items found`);

      // 4. Return clean repository data
      const data = {
        repository: repoResponse.data,
        branch: branchResponse.data,
        tree: treeResponse.data,
        fetchedAt: new Date().toISOString(),
        fetchedBy: userId
      };

      console.log('=== GitGithubAdapter.fetchRepo completed successfully ===');
      return data;
    } catch (error) {
      console.error(`=== ERROR in GitGithubAdapter.fetchRepo ===`);
      console.error(`Error type: ${error.constructor.name}`);
      console.error(`Error message: ${error.message}`);
      console.error(`Error status: ${error.status}`);
      console.error(`Error response:`, error.response?.data);
      console.error(`Full error:`, error);
      throw error;
    }
  }



  async fetchDocs(userId, repoId) {
    // Keep your existing docs method unchanged
    const [owner, repo] = repoId.split('/');
    const docsRepo = `${repo}.docs`;
    try {
      const repoResponse = await this.octokit.rest.repos.get({
        owner,
        repo,
        headers: {
          accept: 'application/vnd.github+json'
        }
      });

      const defaultBranch = repoResponse.data.default_branch;

      const response = await this.octokit.rest.repos.downloadZipballArchive({
        owner,
        repo: docsRepo,
        ref: defaultBranch
      });
      console.log(`Docs for '${defaultBranch}' branch downloaded for repository: ${repoId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching docs for repository ${repoId}:`, error.message);
      throw error;
    }
  }


}

module.exports = GitGithubAdapter;
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
  "score": 0.448795319,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:ffdfee9676880383"
}
```

---

### Chunk 14/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 608 characters
- **Score**: 0.431916237
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
// aiGithubAdapter.js
'use strict';
/* eslint-disable no-unused-vars */

class AIGithubAdapter {
  constructor(options = {}) {
    this.githubToken = options.githubToken;
    this.owner = options.owner; // e.g. 'my-github-username'
    this.repoId = options.repoId;   // e.g. 'my-docs-repo'
    this.apiBaseUrl = 'https://api.github.com';
  }

  _getHeaders() {
    return {
      'Authorization': `token ${this.githubToken}`,
      'Content-Type': 'application/json'
    };
  }

  async fetchRepo(userId, repoId) {
  console.log("fetching repo via git module");
  }

  
}

module.exports = AIGithubAdapter;

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
  "score": 0.431916237,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:3b45d7b5f7af6cc9"
}
```

---

### Chunk 15/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 1185 characters
- **Score**: 0.430858612
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
  "score": 0.430858612,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:466416a32abaaf46"
}
```

---

### Chunk 16/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 901 characters
- **Score**: 0.417731285
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
// aiPubsubAdapter.js
'use strict';

class AIPubsubAdapter {
  constructor({ pubSubClient }) {
    this.pubSubClient = pubSubClient;
    this.aiTopic = 'ai-topic';
  }

async publishAiResponse(event, payload) {
  try {
    const topicRef = this.pubSubClient.topic(this.aiTopic);
    
    // Construct the full message object with event type and payload
    const message = {
      event: event,
      ...payload  // ✅ Spread payload directly, not nested under 'payload'
    };

    const messageBuffer = Buffer.from(JSON.stringify(message));
    const messageId = await topicRef.publishMessage({ data: messageBuffer });
    
    console.log(`AI Event '${event}' published with Message ID: ${messageId} to topic: ${this.aiTopic}`);
    return messageId;
  } catch (error) {
    console.error(`Error publishing AI event '${event}':`, error);
    throw error;
  }
}};


module.exports = AIPubsubAdapter;

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
  "score": 0.417731285,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:6eee5abf991833d1"
}
```

---

### Chunk 17/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 1418 characters
- **Score**: 0.410543442
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
  "score": 0.410543442,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:192ad79e20f5e94c"
}
```

---

### Chunk 18/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 6837 characters
- **Score**: 0.408350945
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
  "score": 0.408350945,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:c57b27add1d880c1"
}
```

---

### Chunk 19/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 7359 characters
- **Score**: 0.399242401
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
  "score": 0.399242401,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:6869b6bc7fb3273d"
}
```

---

### Chunk 20/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 19394 characters
- **Score**: 0.397871017
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
// textSearchService.js
'use strict';

/**
 * TextSearchService - PostgreSQL-based text search functionality
 * 
 * Provides full-text search capabilities over stored documents using PostgreSQL's
 * built-in text search features. This complements the vector search from Pinecone
 * by offering exact text matching and keyword-based search.
 */
class TextSearchService {
  constructor({ postgresAdapter, logger = console }) {
    this.postgresAdapter = postgresAdapter;
    this.logger = logger;
  }

  /**
   * Perform basic text search across documents
   * @param {string} searchQuery - The text to search for
   * @param {object} options - Search options
   * @param {string} options.userId - Filter by user ID
   * @param {string} options.repoId - Filter by repository ID
   * @param {number} options.limit - Maximum number of results (default: 10)
   * @param {number} options.offset - Offset for pagination (default: 0)
   * @returns {Array} Array of search results
   */
  async searchDocuments(searchQuery, options = {}) {
    const {
      userId = null,
      repoId = null,
      limit = 10,
      offset = 0
    } = options;

    try {
      const pool = await this.postgresAdapter.getPool();
      const client = await pool.connect();

      try {
        // Extract potential filenames from query
        // Pattern 1: Full filenames with extensions (e.g., "aiService.js", "app.js")
        const filenameWithExtPattern = /\b[\w-]+\.(js|ts|jsx|tsx|py|java|go|rs|md|json|yml|yaml|sql|css|html)\b/gi;
        const filenamesWithExt = searchQuery.match(filenameWithExtPattern) || [];
        
        // Pattern 2: Potential filenames without extensions (e.g., "aiService", "app")
        // Only consider words that look like filenames (camelCase, kebab-case, snake_case)
        const filenameNoExtPattern = /\b([a-z][a-zA-Z0-9_-]*(?:[A-Z][a-zA-Z0-9_-]*)*)\b/g;
        const potentialNames = searchQuery.match(filenameNoExtPattern) || [];
        
        // Filter out common words that are unlikely to be filenames
        const commonWords = new Set(['the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'from', 'by', 'as', 'is', 'was', 'are', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'can', 'between', 'difference', 'explain', 'what', 'how', 'why', 'when', 'where', 'file', 'files']);
        const likelyFilenames = potentialNames.filter(name => 
          !commonWords.has(name.toLowerCase()) && 
          name.length > 2 && 
          (name.includes('_') || name.includes('-') || /[a-z][A-Z]/.test(name)) // Has separators or camelCase
        );
        
        const allPotentialFiles = [...filenamesWithExt, ...likelyFilenames];
        
        // If query contains filenames, prioritize file path search
        if (allPotentialFiles.length > 0) {
          this.logger.info(`🔍 Detected potential filenames: ${allPotentialFiles.join(', ')}`);
          
          // Build dynamic LIKE conditions for all potential filenames
          const likeConditions = allPotentialFiles.map((_, i) => {
            return `(file_path ILIKE $${i + 1} OR file_path ILIKE $${allPotentialFiles.length + i + 1})`;
          });
          
          // Search by file path using case-insensitive LIKE
          let query = `
            SELECT 
              id,
              user_id,
              repo_id,
              file_path,
              file_extension,
              chunk_index,
              chunk_content,
              chunk_tokens,
              metadata,
              CASE 
                -- Exact filename match gets highest priority
                ${allPotentialFiles.map((fn, i) => `WHEN file_path ILIKE '%/${fn}' THEN ${1.0 - i * 0.1}`).join('\n                ')}
                -- Filename anywhere in path gets medium priority
                ${allPotentialFiles.map((fn, i) => `WHEN file_path ILIKE '%${fn}%' THEN ${0.5 - i * 0.05}`).join('\n                ')}
                ELSE 0.1
              END AS rank,
              substring(chunk_content, 1, 200) AS snippet
            FROM ai.repo_data
            WHERE (${likeConditions.join(' OR ')})
          `;
          
          const queryParams = [
            ...allPotentialFiles.map(fn => `%/${fn}`),  // Exact filename at end of path
            ...allPotentialFiles.map(fn => `%${fn}%`)    // Filename anywhere in path
          ];
          let paramIndex = queryParams.length;
          
          // Add filters
          if (userId) {
            paramIndex++;
            query += ` AND user_id = $${paramIndex}`;
            queryParams.push(userId);
          }

          if (repoId) {
            paramIndex++;
            query += ` AND repo_id = $${paramIndex}`;
            queryParams.push(repoId);
          }

          // Add ordering and pagination
          query += ` ORDER BY rank DESC, file_path ASC, chunk_index ASC`;
          
          paramIndex++;
          query += ` LIMIT $${paramIndex}`;
          queryParams.push(limit);

          paramIndex++;
          query += ` OFFSET $${paramIndex}`;
          queryParams.push(offset);

          const result = await client.query(query, queryParams);
          
          this.logger.info(`📄 Filename-based search found ${result.rows.length} results`);
          if (result.rows.length > 0) {
            result.rows.forEach((row, i) => {
              this.logger.info(`   ${i + 1}. ${row.file_path} [chunk ${row.chunk_index || 0}] (rank: ${row.rank})`);
            });
          }
          
          // Format results with rich metadata
          return result.rows.map(row => {
            const metadata = row.metadata || {};
            return {
              id: row.id,
              userId: row.user_id,
              repoId: row.repo_id,
              filePath: row.file_path,
              fileExtension: row.file_extension,
              chunkIndex: row.chunk_index || 0,
              content: row.chunk_content || row.content,  // Fallback for old data
              chunkTokens: row.chunk_tokens,
              rank: parseFloat(row.rank),
              snippet: row.snippet,
              searchType: 'filename_match',
              source: 'postgres',
              // Include rich semantic metadata
              semanticTags: metadata.semantic_tags || [],
              ubiquitousLanguage: metadata.ubiquitous_language || [],
              domainConcepts: metadata.domain_concepts || [],
              functionNames: metadata.function_names || [],
              classNames: metadata.class_names || [],
              type: metadata.type || 'github-code',
              branch: metadata.branch || 'main'
            };
          });
        }
        
        // Otherwise, fall back to full-text search on content
        this.logger.info(`📝 No filenames detected, using content-based full-text search`);
        let query = `
          SELECT 
            id,
            user_id,
            repo_id,
            file_path,
            file_extension,
            chunk_index,
            chunk_content,
            chunk_tokens,
            metadata,
            ts_rank(content_vector, plainto_tsquery('english', $1)) AS rank,
            ts_headline('english', chunk_content, plainto_tsquery('english', $1), 'MaxWords=30') AS snippet
          FROM ai.repo_data
          WHERE content_vector @@ plainto_tsquery('english', $1)
        `;

        const queryParams = [searchQuery];
        let paramIndex = 1;

        // Add filters
        if (userId) {
          paramIndex++;
          query += ` AND user_id = $${paramIndex}`;
          queryParams.push(userId);
        }

        if (repoId) {
          paramIndex++;
          query += ` AND repo_id = $${paramIndex}`;
          queryParams.push(repoId);
        }

        // Add ordering and pagination
        query += ` ORDER BY rank DESC, chunk_index ASC`;
        
        paramIndex++;
        query += ` LIMIT $${paramIndex}`;
        queryParams.push(limit);

        paramIndex++;
        query += ` OFFSET $${paramIndex}`;
        queryParams.push(offset);

        this.logger.info(`🔍 Text search query: "${searchQuery}" with ${queryParams.length - 1} filters`);
        
        const result = await client.query(query, queryParams);
        
        this.logger.info(`📄 Text search found ${result.rows.length} results`);
        
        // Format results with rich metadata
        return result.rows.map(row => {
          const metadata = row.metadata || {};
          return {
            id: row.id,
            userId: row.user_id,
            repoId: row.repo_id,
            filePath: row.file_path,
            fileExtension: row.file_extension,
            chunkIndex: row.chunk_index || 0,
            content: row.chunk_content || row.content,  // Fallback for migrated data
            chunkTokens: row.chunk_tokens,
            rank: parseFloat(row.rank),
            snippet: row.snippet,
            searchType: 'fulltext_content',
            source: 'postgres',
            // Include rich semantic metadata
            semanticTags: metadata.semantic_tags || [],
            ubiquitousLanguage: metadata.ubiquitous_language || [],
            domainConcepts: metadata.domain_concepts || [],
            functionNames: metadata.function_names || [],
            classNames: metadata.class_names || [],
            type: metadata.type || 'github-code',
            branch: metadata.branch || 'main'
          };
        });
      
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error('Text search error:', error);
      throw new Error(`Text search failed: ${error.message}`);
    }
  }

  /**
   * Perform case-insensitive partial text search using ILIKE
   * @param {string} searchQuery - The text to search for
   * @param {object} options - Search options (same as searchDocuments)
   * @returns {Array} Array of search results
   */
  async searchDocumentsSimple(searchQuery, options = {}) {
    const {
      userId = null,
      repoId = null,
      limit = 10,
      offset = 0
    } = options;

    try {
      const pool = await this.postgresAdapter.getPool();
      const client = await pool.connect();

      try {
        let query = `
          SELECT 
            id,
            user_id,
            repo_id,
            file_path,
            file_extension,
            content,
            CASE 
              WHEN content ILIKE $1 THEN 1.0
              WHEN content ILIKE '%' || $1 || '%' THEN 0.5
              ELSE 0.1
            END AS rank
          FROM ai.repo_data
          WHERE content ILIKE '%' || $1 || '%'
        `;

        const queryParams = [searchQuery];
        let paramIndex = 1;

        // Add filters
        if (userId) {
          paramIndex++;
          query += ` AND user_id = $${paramIndex}`;
          queryParams.push(userId);
        }

        if (repoId) {
          paramIndex++;
          query += ` AND repo_id = $${paramIndex}`;
          queryParams.push(repoId);
        }

        // Add ordering and pagination
        query += ` ORDER BY rank DESC, id DESC`;
        
        paramIndex++;
        query += ` LIMIT $${paramIndex}`;
        queryParams.push(limit);

        paramIndex++;
        query += ` OFFSET $${paramIndex}`;
        queryParams.push(offset);

        this.logger.info(`🔍 Simple text search query: "${searchQuery}"`);
        
        const result = await client.query(query, queryParams);
        
        this.logger.info(`📄 Simple text search found ${result.rows.length} results`);
        
        // Format results
        return result.rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          repoId: row.repo_id,
          filePath: row.file_path,
          fileExtension: row.file_extension,
          content: row.content,
          rank: parseFloat(row.rank),
          snippet: this.createSnippet(row.content, searchQuery),
          searchType: 'simple_text',
          source: 'postgres'
        }));

      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error('Simple text search error:', error);
      throw new Error(`Simple text search failed: ${error.message}`);
    }
  }

  /**
   * Create a snippet highlighting the search term
   * @param {string} content - Full content
   * @param {string} searchTerm - Search term to highlight
   * @returns {string} Snippet with highlighted term
   */
  createSnippet(content, searchTerm, maxLength = 200) {
    if (!content || !searchTerm) return content;

    const searchIndex = content.toLowerCase().indexOf(searchTerm.toLowerCase());
    if (searchIndex === -1) return content.substring(0, maxLength);

    const start = Math.max(0, searchIndex - 50);
    const end = Math.min(content.length, searchIndex + searchTerm.length + 50);
    
    let snippet = content.substring(start, end);
    
    // Add ellipsis if we truncated
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return snippet;
  }

  /**
   * Get search statistics
   * @param {string} userId - Optional user filter
   * @param {string} repoId - Optional repo filter
   * @returns {object} Statistics about searchable documents
   */
  async getSearchStats(userId = null, repoId = null) {
    try {
      const pool = await this.postgresAdapter.getPool();
      const client = await pool.connect();

      try {
        let query = `
          SELECT 
            COUNT(*) as total_documents,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(DISTINCT repo_id) as unique_repos,
            COUNT(DISTINCT file_extension) as unique_file_types,
            AVG(LENGTH(content)) as avg_content_length
          FROM ai.repo_data
          WHERE 1=1
        `;

        const queryParams = [];
        let paramIndex = 0;

        if (userId) {
          paramIndex++;
          query += ` AND user_id = $${paramIndex}`;
          queryParams.push(userId);
        }

        if (repoId) {
          paramIndex++;
          query += ` AND repo_id = $${paramIndex}`;
          queryParams.push(repoId);
        }

        const result = await client.query(query, queryParams);
        
        return {
          totalDocuments: parseInt(result.rows[0].total_documents),
          uniqueUsers: parseInt(result.rows[0].unique_users),
          uniqueRepos: parseInt(result.rows[0].unique_repos),
          uniqueFileTypes: parseInt(result.rows[0].unique_file_types),
          avgContentLength: Math.round(parseFloat(result.rows[0].avg_content_length) || 0)
        };

      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error('Error getting search stats:', error);
      throw new Error(`Failed to get search stats: ${error.message}`);
    }
  }

  /**
   * Check if text search is available (database connection working)
   * @returns {boolean} True if text search is available
   */
  async isAvailable() {
    try {
      const pool = await this.postgresAdapter.getPool();
      const client = await pool.connect();
      
      try {
        await client.query('SELECT 1');
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.warn('Text search not available:', error.message);
      return false;
    }
  }

  /**
   * Get all chunks for a specific file (bypasses FTS ranking)
   * This is used for file-specific queries to ensure ALL chunks are retrieved
   * @param {object} params - Query parameters
   * @param {string} params.userId - User ID
   * @param {string} params.repoId - Repository ID  
   * @param {string} params.filePath - Exact file path
   * @param {number} params.limit - Max chunks to return (default 500)
   * @returns {Array} All chunks for the file, ordered by chunk_index
   */
  async getFileChunks({ userId, repoId, filePath, limit = 500 }) {
    try {
      const pool = await this.postgresAdapter.getPool();
      const client = await pool.connect();
      
      try {
        const query = `
          SELECT 
            file_path,
            chunk_index,
            chunk_content,
            chunk_tokens,
            metadata,
            file_extension
          FROM ai.repo_data
          WHERE user_id = $1 
            AND repo_id = $2 
            AND file_path = $3
          ORDER BY chunk_index ASC
          LIMIT $4
        `;
        
        const result = await client.query(query, [userId, repoId, filePath, limit]);
        
        this.logger.info(`📁 Direct file load: ${result.rows.length} chunks from ${filePath}`);
        
        return result.rows.map(row => ({
          file_path: row.file_path,
          chunk_index: row.chunk_index,
          chunk_content: row.chunk_content,
          chunk_tokens: row.chunk_tokens,
          metadata: row.metadata,
          file_extension: row.file_extension,
          rank: 1.0 // Highest priority for exact file matches
        }));
        
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error(`Error loading file chunks for ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Find all file paths matching a filename pattern
   * @param {object} params - Query parameters
   * @param {string} params.userId - User ID
   * @param {string} params.repoId - Repository ID
   * @param {string} params.filename - Filename to search for (e.g., "aiService.js")
   * @returns {Array} Matching file paths
   */
  async findFilePaths({ userId, repoId, filename }) {
    try {
      const pool = await this.postgresAdapter.getPool();
      const client = await pool.connect();
      
      try {
        const query = `
          SELECT DISTINCT file_path
          FROM ai.repo_data
          WHERE user_id = $1 
            AND repo_id = $2 
            AND file_path ILIKE $3
          LIMIT 10
        `;
        
        // Try exact match first, then fallback to pattern
        const patterns = [
          `%/${filename}`,  // Exact filename at end of path
          `%${filename}%`   // Filename anywhere in path
        ];
        
        for (const pattern of patterns) {
          const result = await client.query(query, [userId, repoId, pattern]);
          if (result.rows.length > 0) {
            this.logger.info(`🔍 Found ${result.rows.length} file(s) matching: ${filename}`);
            return result.rows.map(r => r.file_path);
          }
        }
        
        return [];
        
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error(`Error finding file paths for ${filename}:`, error);
      return [];
    }
  }

  /**
   * Store document chunks (delegates to persistence adapter)
   * SYNCHRONIZED CHUNKING: Stores the same chunks as Pinecone with rich metadata
   * @param {Array} chunks - Array of document chunks with pageContent and metadata
   * @param {string} params.userId - User ID who owns the repository
   * @param {string} params.repoId - Repository ID
   * @param {object} params.options - Storage options
   * @returns {object} Result with counts of stored chunks
   */
  async storeChunks(chunks, userId, repoId, options = {}) {
    return await this.postgresAdapter.storeRepoChunks(chunks, userId, repoId, options);
  }
}

module.exports = TextSearchService;

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
  "score": 0.397871017,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:519821b7a1e3139b"
}
```

---

### Chunk 21/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 24223 characters
- **Score**: 0.393350631
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
  "score": 0.393350631,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:9ca198d32100df07"
}
```

---

### Chunk 22/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 1236 characters
- **Score**: 0.392845184
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
  "score": 0.392845184,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:c6b16a3841f84568"
}
```

---

### Chunk 23/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 4422 characters
- **Score**: 0.388680458
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
  "score": 0.388680458,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:912b67ad805b9d05"
}
```

---

### Chunk 24/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 4079 characters
- **Score**: 0.386951447
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
  "score": 0.386951447,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:b6a272f88a31a774"
}
```

---

### Chunk 25/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 653 characters
- **Score**: 0.385957718
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
  "score": 0.385957718,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:54a3f07013077594"
}
```

---

### Chunk 26/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 1571 characters
- **Score**: 0.381282836
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
  "score": 0.381282836,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:4153a9a6bbfde258"
}
```

---

### Chunk 27/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 12646 characters
- **Score**: 0.377771378
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
// aiRouter.js
'use strict';
const fp = require('fastify-plugin');

module.exports = fp(async function aiRouter(fastify, opts) {
  console.log('aiRouter is loaded!');

  fastify.route({
    method: 'POST',
    url: '/respond',
    preValidation: [fastify.verifyToken],
    handler: fastify.respondToPrompt,
    schema: {
      tags: ['ai'],
      body: {
        type: 'object',
        required: ['conversationId', 'prompt'],
        properties: {
          conversationId: { type: 'string', minLength: 1 },
          prompt: { type: 'string', minLength: 1 }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            response: { type: 'string' }, // or object/array depending on actual response shape!
            status: { type: 'string', enum: ['success', 'failure'] },
            timestamp: { type: 'string', format: 'date-time' }
          },
          required: ['response', 'status', 'timestamp'],
          additionalProperties: false
        }
      }
    }
  });
  
  fastify.route({
    method: 'POST',
    url: '/process-pushed-repo',
    preValidation: [fastify.verifyToken],
    handler: fastify.processPushedRepo,
    schema: {
      tags: ['ai'],
      body: {
        type: 'object',
        required: ['repoId', 'repoData'],
        properties: {
          repoId: { type: 'string', minLength: 1 },
          repoData: { type: 'object' } // If you can specify the shape, do so!
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object', // Adjust shape to match what you actually return!
          properties: {
            result: { type: 'string' }, // or whatever your response shape is
            details: { type: 'object' }
          },
          additionalProperties: true // or false if you want strict checking
        }
      }
    }
  });

  fastify.route({
    method: 'POST',
    url: '/manual-process-repo-direct',
    preValidation: [fastify.verifyToken],
    handler: fastify.manualProcessRepoDirect,
    schema: {
      tags: ['ai'],
      summary: 'Manually process a repository directly for RAG indexing',
      description: 'Directly trigger repository processing for vector embedding storage without external GitHub API calls',
      body: {
        type: 'object',
        required: ['repoId'],
        properties: {
          repoId: { 
            type: 'string', 
            minLength: 1,
            description: 'Repository identifier (e.g., "owner/repo-name")'
          },
          githubOwner: { 
            type: 'string',
            description: 'GitHub repository owner/organization name (optional, will be extracted from repoId if not provided)'
          },
          repoName: { 
            type: 'string',
            description: 'GitHub repository name (optional, will be extracted from repoId if not provided)'
          },
          branch: { 
            type: 'string', 
            default: 'main',
            description: 'Repository branch to process (defaults to "main")'
          },
          repoUrl: { 
            type: 'string',
            description: 'Full repository URL (optional, will be constructed if not provided)'
          }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            repoId: { type: 'string' },
            repoData: {
              type: 'object',
              properties: {
                githubOwner: { type: 'string' },
                repoName: { type: 'string' },
                repoUrl: { type: 'string' },
                branch: { type: 'string' },
                description: { type: 'string' },
                timestamp: { type: 'string' }
              },
              additionalProperties: false
            },
            data: { 
              type: 'object',
              additionalProperties: true
            }
          },
          additionalProperties: false
        }
      }
    }
  });

  // Text search endpoint
  fastify.route({
    method: 'GET',
    url: '/search/text',
    preValidation: [fastify.verifyToken],
    handler: fastify.searchText,
    schema: {
      tags: ['ai', 'search'],
      summary: 'Search documents using PostgreSQL text search',
      description: 'Perform text-based search across stored documents using PostgreSQL full-text search capabilities',
      querystring: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { 
            type: 'string', 
            minLength: 1,
            description: 'Search query text'
          },
          repoId: { 
            type: 'string',
            description: 'Filter by repository ID (optional)'
          },
          limit: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 50, 
            default: 10,
            description: 'Maximum number of results to return'
          },
          offset: { 
            type: 'integer', 
            minimum: 0, 
            default: 0,
            description: 'Offset for pagination'
          }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  userId: { type: 'string' },
                  repoId: { type: 'string' },
                  content: { type: 'string' },
                  rank: { type: 'number' },
                  snippet: { type: 'string' },
                  searchType: { type: 'string' },
                  source: { type: 'string' }
                },
                required: ['id', 'content', 'rank', 'searchType', 'source'],
                additionalProperties: false
              }
            },
            query: { type: 'string' },
            totalResults: { type: 'integer' },
            searchType: { type: 'string', enum: ['text'] }
          },
          required: ['results', 'query', 'totalResults', 'searchType'],
          additionalProperties: false
        }
      }
    }
  });

  // Hybrid search endpoint
  fastify.route({
    method: 'GET',
    url: '/search/hybrid',
    preValidation: [fastify.verifyToken],
    handler: fastify.searchHybrid,
    schema: {
      tags: ['ai', 'search'],
      summary: 'Search documents using both vector and text search',
      description: 'Perform hybrid search combining Pinecone vector search and PostgreSQL text search for comprehensive results',
      querystring: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { 
            type: 'string', 
            minLength: 1,
            description: 'Search query text'
          },
          repoId: { 
            type: 'string',
            description: 'Filter by repository ID (optional)'
          },
          limit: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 50, 
            default: 10,
            description: 'Maximum number of results to return'
          },
          includeVector: { 
            type: 'boolean', 
            default: true,
            description: 'Include vector search results'
          },
          includeText: { 
            type: 'boolean', 
            default: true,
            description: 'Include text search results'
          },
          strategy: { 
            type: 'string', 
            enum: ['interleave', 'vector_first', 'text_first'], 
            default: 'interleave',
            description: 'Strategy for merging results from different search types'
          }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  content: { type: 'string' },
                  rank: { type: 'number' },
                  snippet: { type: 'string' },
                  searchType: { type: 'string', enum: ['vector', 'text', 'simple_text'] },
                  source: { type: 'string', enum: ['pinecone', 'postgres'] },
                  metadata: { type: 'object' }
                },
                required: ['id', 'content', 'rank', 'searchType', 'source'],
                additionalProperties: true
              }
            },
            query: { type: 'string' },
            totalResults: { type: 'integer' },
            searchType: { type: 'string', enum: ['hybrid'] },
            searchStats: {
              type: 'object',
              properties: {
                vectorResults: { type: 'integer' },
                textResults: { type: 'integer' }
              }
            }
          },
          required: ['results', 'query', 'totalResults', 'searchType'],
          additionalProperties: false
        }
      }
    }
  });

  // Search capabilities endpoint
  fastify.route({
    method: 'GET',
    url: '/search/capabilities',
    preValidation: [fastify.verifyToken],
    handler: fastify.getSearchCapabilities,
    schema: {
      tags: ['ai', 'search'],
      summary: 'Get information about available search capabilities',
      description: 'Returns information about which search systems are available and their status',
      response: {
        200: {
          type: 'object',
          properties: {
            vectorSearch: {
              type: 'object',
              properties: {
                available: { type: 'boolean' },
                connected: { type: 'boolean' }
              },
              required: ['available', 'connected']
            },
            textSearch: {
              type: 'object',
              properties: {
                available: { type: 'boolean' },
                connected: { type: 'boolean' }
              },
              required: ['available', 'connected']
            },
            hybridSearch: {
              type: 'object',
              properties: {
                available: { type: 'boolean' }
              },
              required: ['available']
            },
            detailed: { type: 'object' }
          },
          required: ['vectorSearch', 'textSearch', 'hybridSearch'],
          additionalProperties: true
        }
      }
    }
  });

  // Test search systems endpoint
  fastify.route({
    method: 'POST',
    url: '/search/test',
    preValidation: [fastify.verifyToken],
    handler: fastify.testSearchSystems,
    schema: {
      tags: ['ai', 'search'],
      summary: 'Test all search systems with a sample query',
      description: 'Runs a test query against all available search systems to verify they are working correctly',
      body: {
        type: 'object',
        properties: {
          testQuery: { 
            type: 'string', 
            default: 'function',
            description: 'Query to test with (defaults to "function")'
          }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            vectorSearch: {
              type: 'object',
              properties: {
                available: { type: 'boolean' },
                success: { type: 'boolean' },
                results: { type: 'array' },
                error: { type: 'string' }
              },
              required: ['available', 'success', 'results']
            },
            textSearch: {
              type: 'object',
              properties: {
                available: { type: 'boolean' },
                success: { type: 'boolean' },
                results: { type: 'array' },
                error: { type: 'string' }
              },
              required: ['available', 'success', 'results']
            },
            hybridSearch: {
              type: 'object',
              properties: {
                available: { type: 'boolean' },
                success: { type: 'boolean' },
                results: { type: 'object' },
                error: { type: 'string' }
              },
              required: ['available', 'success', 'results']
            }
          },
          required: ['vectorSearch', 'textSearch', 'hybridSearch'],
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
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.377771378,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:93123b9cc7039eef"
}
```

---

### Chunk 28/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 14508 characters
- **Score**: 0.372627258
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
  "score": 0.372627258,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:d34dd65ab992bb88"
}
```

---

### Chunk 29/31
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 954 characters
- **Score**: 0.372436553
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
  "score": 0.372436553,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:3e4a78a9ee92da67"
}
```

---

### Chunk 30/31
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 8826 characters
- **Score**: 0.351226807
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
  "score": 0.351226807,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:338334d4716a49e5"
}
```

---

### Chunk 31/31
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 2317 characters
- **Score**: 0.255773544
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
  "score": 0.255773544,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:cbd04b8163ca8712"
}
```

---


## 🤖 AI Response Analysis

### Generated Response:
**Status**: ✅ Generated Successfully
**Response Length**: 810 characters
**Generated At**: 2025-11-05T12:03:33.844Z

### Response Content:
```markdown
Based on the actual code provided, the `authPostgresAdapter.js` file contains the following methods:

1. `getPool()`: This method retrieves a PostgreSQL connection pool, either a local pool or a Cloud SQL pool depending on the environment.
2. `createLocalPool()`: This method creates a local PostgreSQL connection pool using environment variables for the connection details.
3. `createCloudSqlPool(connector)`: This method creates a Cloud SQL connection pool using the provided `cloudSqlConnector` instance.

The `authPostgresAdapter.js` file is an implementation of the `IAuthPersistPort` interface, which defines the contract for authentication-related persistence operations. However, I don't see any other specific methods listed in this file, as the rest of the interface methods are not implemented here.
```

### Response Quality Assessment:
- **Relevance to Query**: MEDIUM - Partially addresses query
- **Use of Context**: MEDIUM - Implicit context usage
- **Response Completeness**: GOOD - Structured with adequate detail

### Key Response Elements:
- **Structured Lists**: 3 numbered points
- **File References**: 2 specific files mentioned
- **Technical Terms**: 3 technical concepts used

---


## 📈 Performance Metrics

### Search Efficiency:
- **Query Processing Time**: 6112ms
- **Documents Retrieved**: 31
- **Unique Sources**: 1
- **Average Raw Chunk Size**: 5758 characters (original)
- **Average Formatted Chunk Size**: 1386 characters (sent to LLM)

### Context Quality:
- **Relevance Score**: HIGH (31 relevant chunks found)
- **Diversity Score**: LOW (1 unique sources)
- **Raw Content Size**: 178,492 characters (retrieved from vector DB)
- **Formatted Context Size**: 42,957 characters (actually sent to LLM)
- **Context Efficiency**: 24% (lower = more truncation/formatting overhead)

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

- **Query Type**: Informational/Explanatory
- **Domain Focus**: General Application
- **Technical Complexity**: High
- **Expected Response Type**: Explanatory

## 🚀 Recommendations

- **Optimize Query Performance**: Query took over 5 seconds, consider caching or index optimization
- **Increase Source Diversity**: All chunks from same source, consider broader indexing

## ✨ Conclusion

This comprehensive LangSmith trace demonstrates excellent RAG performance with:
- **Retrieval Quality**: Excellent
- **Context Diversity**: Medium
- **Raw Content Retrieved**: 178,492 characters from vector database
- **Formatted Context Sent**: 42,957 characters to LLM
- **Context Efficiency**: 24% (truncation applied)
- **Response Quality**: Comprehensive

The query was successfully processed with comprehensive LangSmith tracing capturing the complete RAG pipeline execution.

---
**Generated**: 2025-11-05T12:03:33.846Z  
**LangSmith Project**: eventstorm-trace  
**Trace Type**: Comprehensive RAG Analysis
**Auto-Generated**: true
