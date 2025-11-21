---
**ARCHIVED TRACE ANALYSIS**
- Archived on: 2025-11-03T16:12:00.973Z
- Triggered by query: "list all methods in ai"
- Original file: latest-trace-analysis.md
---

# LangSmith RAG Trace Analysis - 11/3/2025, 3:43:57 PM

## 🔍 Query Details
- **Query**: "what abpout the aiPostgresAdapter.js >"
- **User ID**: d41402df-182a-41ec-8f05-153118bf2718
- **Conversation ID**: d1644585-4365-4460-9f4c-db0316803d4c
- **Started**: 2025-11-03T15:43:57.194Z
- **Completed**: 2025-11-03T15:44:02.555Z
- **Total Duration**: 5361ms

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
1. **initialization** (2025-11-03T15:43:57.194Z) - success
2. **vector_store_check** (2025-11-03T15:43:57.194Z) - success
3. **vector_search** (2025-11-03T15:44:00.459Z) - success - Found 28 documents
4. **text_search** (2025-11-03T15:44:00.464Z) - success
5. **hybrid_search_combination** (2025-11-03T15:44:00.464Z) - success
6. **context_building** (2025-11-03T15:44:00.464Z) - success - Context: 37706 chars
7. **response_generation** (2025-11-03T15:44:02.555Z) - success - Response: 307 chars

## 📊 Vector Search Analysis

### Search Configuration:
- **Vector Store**: primary
- **Search Strategy**: intelligent_strategy_with_filters
- **Documents Retrieved**: 28
- **Raw Content Size**: 160,562 characters (original chunks)
- **Formatted Context Size**: 37,706 characters (sent to LLM)
- **Compression Ratio**: 23% (due to truncation + formatting overhead)

### Source Type Distribution:
- **GitHub Repository Code**: 28 chunks (100%)
- **Module Documentation**: 0 chunks (0%)  
- **Architecture Documentation**: 0 chunks (0%)
- **API Specification**: 0 chunks (0%)
- **Other Sources**: 0 chunks (0%)

## 🏷️ Ubiquitous Language (UL) Tags Analysis

### UL Tag Coverage:
- **Chunks with UL Tags**: 0/28 (0%)
- **Chunks without UL Tags**: 28/28 (100%)
- **Coverage Status**: ❌ Poor - Repository may need re-indexing

### Domain Coverage:
- **Bounded Contexts**: 0 unique contexts
  
- **Business Modules**: 0 unique modules
  
- **Total UL Terms**: 0 terms found across all chunks
- **Unique Terms**: 0 distinct terms
  
- **Domain Events**: 0 unique events
  

### ⚠️ Missing UL Tags Warning:
28 chunks (100%) are missing ubiquitous language tags. This may indicate:
- Files indexed before UL enhancement was implemented (check `processedAt` timestamps)
- Non-code files (markdown analysis files, configs) that bypass UL processing
- Repository needs re-indexing to apply current UL enhancement pipeline
- Error during UL enhancement (check logs for warnings)

**Recommendation**: 🔴 **CRITICAL**: Re-index repository to apply UL tags to all chunks



## 📋 Complete Chunk Analysis


### Chunk 1/28
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 3119 characters
- **Score**: 0.6048069
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
  "score": 0.6048069,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:805539bd1311c725"
}
```

---

### Chunk 2/28
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 1000 characters
- **Score**: 0.409322739
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
  "score": 0.409322739,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:f5f6a9819e3adf32"
}
```

---

### Chunk 3/28
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 6338 characters
- **Score**: 0.340280533
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
  "score": 0.340280533,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:9ebe3528d2dd55c2"
}
```

---

### Chunk 4/28
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 8386 characters
- **Score**: 0.320428848
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
  "score": 0.320428848,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:7372d7728f242b75"
}
```

---

### Chunk 5/28
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 5324 characters
- **Score**: 0.287290573
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
  "score": 0.287290573,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:7498c4d3da949337"
}
```

---

### Chunk 6/28
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 1771 characters
- **Score**: 0.284097672
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
  "score": 0.284097672,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:a6a87f5f25105891"
}
```

---

### Chunk 7/28
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 3663 characters
- **Score**: 0.610464156
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
  "score": 0.610464156,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:b72df36c90ee403f"
}
```

---

### Chunk 8/28
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 5764 characters
- **Score**: 0.576370299
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
  "score": 0.576370299,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:dbc8bb8904c1d14c"
}
```

---

### Chunk 9/28
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 24223 characters
- **Score**: 0.43755722
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
  "score": 0.43755722,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:9ca198d32100df07"
}
```

---

### Chunk 10/28
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 10143 characters
- **Score**: 0.408430099
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
  "score": 0.408430099,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:3748242fdecdbb5a"
}
```

---

### Chunk 11/28
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 3829 characters
- **Score**: 0.401506424
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
  "score": 0.401506424,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:a355675cfa68a9ed"
}
```

---

### Chunk 12/28
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 12115 characters
- **Score**: 0.388801605
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
  "score": 0.388801605,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:34252dea0c111df7"
}
```

---

### Chunk 13/28
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 4198 characters
- **Score**: 0.386188507
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
  "score": 0.386188507,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:77a1b863d9556d37"
}
```

---

### Chunk 14/28
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 409 characters
- **Score**: 0.370386124
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
  "score": 0.370386124,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:43e1ec874b06fba9"
}
```

---

### Chunk 15/28
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 3784 characters
- **Score**: 0.36987114
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
  "score": 0.36987114,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:ffdfee9676880383"
}
```

---

### Chunk 16/28
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 16993 characters
- **Score**: 0.348367691
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
  "score": 0.348367691,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:403f3717e6cfe043"
}
```

---

### Chunk 17/28
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 483 characters
- **Score**: 0.347646713
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
  "score": 0.347646713,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:125ce3a4ad048517"
}
```

---

### Chunk 18/28
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 1185 characters
- **Score**: 0.338565826
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
  "score": 0.338565826,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:466416a32abaaf46"
}
```

---

### Chunk 19/28
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 648 characters
- **Score**: 0.327249527
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
// pubsubPlugin.js
/* eslint-disable no-unused-vars */
'use strict';
const fp = require('fastify-plugin');
const { PubSub } = require('@google-cloud/pubsub');


module.exports = fp(async function pubsubCPlugin(fastify, opts) {
  const pubsubClient = new PubSub();

  fastify.decorate('pubsubClient', pubsubClient);

  fastify.log.info('✅ PubSub client registered in current scope');

  // Optional: handle shutdown
  fastify.addHook('onClose', async (instance, done) => {
    // Normally PubSub has no explicit close method, but you can add cleanup here if needed
    fastify.log.info('🧹 pubsubClient plugin scope closing');
    done();
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
  "score": 0.327249527,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:54db93dc2e0a2169"
}
```

---

### Chunk 20/28
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 14508 characters
- **Score**: 0.325489044
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
  "score": 0.325489044,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:d34dd65ab992bb88"
}
```

---

### Chunk 21/28
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 10406 characters
- **Score**: 0.322082549
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
  "score": 0.322082549,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:76ac57a41178be0a"
}
```

---

### Chunk 22/28
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 1113 characters
- **Score**: 0.319860458
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
  "score": 0.319860458,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:d5ea7b9b00722854"
}
```

---

### Chunk 23/28
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 434 characters
- **Score**: 0.31080249
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
  "score": 0.31080249,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:05a2fe4caa922298"
}
```

---

### Chunk 24/28
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 653 characters
- **Score**: 0.306932479
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
  "score": 0.306932479,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:54a3f07013077594"
}
```

---

### Chunk 25/28
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 1571 characters
- **Score**: 0.3021622
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
  "score": 0.3021622,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:4153a9a6bbfde258"
}
```

---

### Chunk 26/28
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 7359 characters
- **Score**: 0.297298431
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
  "score": 0.297298431,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:6869b6bc7fb3273d"
}
```

---

### Chunk 27/28
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 2317 characters
- **Score**: 0.306312561
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
  "score": 0.306312561,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:cbd04b8163ca8712"
}
```

---

### Chunk 28/28
- **Source**: anatolyZader/vc-3
- **Type**: github-docs
- **Size**: 8826 characters
- **Score**: 0.280023575
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
  "score": 0.280023575,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:338334d4716a49e5"
}
```

---


## 🤖 AI Response Analysis

### Generated Response:
**Status**: ✅ Generated Successfully
**Response Length**: 307 characters
**Generated At**: 2025-11-03T15:44:02.558Z

### Response Content:
```markdown
Based on the actual code provided, the `aiPostgresAdapter.js` file does not exist in the given context. The code context contains various files related to the EventStorm.me application, such as `userService.js`, `diPlugin.js`, `app.js`, and others, but there is no mention of an `aiPostgresAdapter.js` file.
```

### Response Quality Assessment:
- **Relevance to Query**: LOW - Limited relevance to query terms
- **Use of Context**: MEDIUM - Implicit context usage
- **Response Completeness**: MEDIUM - Adequate detail but could be better structured

### Key Response Elements:
- **File References**: 5 specific files mentioned

---


## 📈 Performance Metrics

### Search Efficiency:
- **Query Processing Time**: 5361ms
- **Documents Retrieved**: 28
- **Unique Sources**: 1
- **Average Raw Chunk Size**: 5734 characters (original)
- **Average Formatted Chunk Size**: 1347 characters (sent to LLM)

### Context Quality:
- **Relevance Score**: HIGH (28 relevant chunks found)
- **Diversity Score**: LOW (1 unique sources)
- **Raw Content Size**: 160,562 characters (retrieved from vector DB)
- **Formatted Context Size**: 37,706 characters (actually sent to LLM)
- **Context Efficiency**: 23% (lower = more truncation/formatting overhead)

### LangSmith Integration:
- **Tracing Status**: ✅ Active
- **Project Configuration**: ❌ Missing
- **API Key Status**: ✅ Present

## 🔍 Source Analysis

### Most Frequent Sources:
- **anatolyZader/vc-3**: 28 chunks

### Repository Coverage:
- No repository sources detected

## 🎯 Query Classification & Analysis

- **Query Type**: Informational/Explanatory
- **Domain Focus**: General Application
- **Technical Complexity**: Medium
- **Expected Response Type**: Informational

## 🚀 Recommendations

- **Optimize Query Performance**: Query took over 5 seconds, consider caching or index optimization
- **Increase Source Diversity**: All chunks from same source, consider broader indexing

## ✨ Conclusion

This comprehensive LangSmith trace demonstrates excellent RAG performance with:
- **Retrieval Quality**: Excellent
- **Context Diversity**: Medium
- **Raw Content Retrieved**: 160,562 characters from vector database
- **Formatted Context Sent**: 37,706 characters to LLM
- **Context Efficiency**: 23% (truncation applied)
- **Response Quality**: Adequate

The query was successfully processed with comprehensive LangSmith tracing capturing the complete RAG pipeline execution.

---
**Generated**: 2025-11-03T15:44:02.558Z  
**LangSmith Project**: eventstorm-trace  
**Trace Type**: Comprehensive RAG Analysis
**Auto-Generated**: true
