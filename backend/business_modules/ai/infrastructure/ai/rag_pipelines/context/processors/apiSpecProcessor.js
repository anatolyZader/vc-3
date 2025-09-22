// ApiSpecProcessor.js
"use strict";

const fs = require('fs').promises;
const path = require('path');
const { PineconeStore } = require('@langchain/pinecone');

/**
 * Dedicated processor for API specification files
 * Handles JSON API specs, creates endpoint-specific chunks, and schema documentation
 */
class ApiSpecProcessor {
  constructor(options = {}) {
    this.embeddings = options.embeddings;
    this.pineconeLimiter = options.pineconeLimiter;
    this.repositoryManager = options.repositoryManager;
    this.pineconeManager = options.pineconeManager;
    
    // Get the shared Pinecone service from the connection manager
    this.pineconeService = this.pineconeManager?.getPineconeService();
    this.pinecone = this.pineconeService; // For backward compatibility
  }

  /**
   * Process API specification files
   */
  async processApiSpec(namespace = 'core-docs') {
    console.log(`[${new Date().toISOString()}] 🔵 API-SPEC PROCESSOR: Starting API specification processing`);
    console.log(`[${new Date().toISOString()}] 🎯 EXPLANATION: Processing API specification files to create searchable endpoint documentation, schemas, and request/response formats`);

    const documents = [];

    // Load main API spec file
    const apiSpecDoc = await this.loadApiSpec('httpApiSpec.json');
    if (apiSpecDoc) {
      documents.push(apiSpecDoc);
      console.log(`[${new Date().toISOString()}] 📄 API-SPEC: Loaded main API specification file`);

      // Parse and create endpoint-specific chunks
      try {
        const apiSpecJson = JSON.parse(apiSpecDoc.pageContent);
        await this.chunkApiSpecEndpoints(apiSpecJson, documents);
        await this.chunkApiSpecSchemas(apiSpecJson, documents);
        console.log(`[${new Date().toISOString()}] ✂️  API-SPEC: Created granular chunks for endpoints and schemas`);
      } catch (parseError) {
        console.warn(`[${new Date().toISOString()}] ⚠️ API-SPEC: Could not parse API spec for chunking:`, parseError.message);
      }
    }

    if (documents.length === 0) {
      console.log(`[${new Date().toISOString()}] ⚠️ API-SPEC: No API specification documents found to process`);
      return { success: true, documentsProcessed: 0, chunksGenerated: 0 };
    }

    // Store in vector database
    await this.storeApiSpecDocuments(documents, namespace);

    console.log(`[${new Date().toISOString()}] ✅ API-SPEC PROCESSOR: Successfully processed ${documents.length} API specification chunks`);

    return {
      success: true,
      documentsProcessed: 1, // Main spec file
      chunksGenerated: documents.length,
      namespace,
      processedAt: new Date().toISOString()
    };
  }

  /**
   * Load API specification file from backend root
   */
  async loadApiSpec(filePath) {
    const backendRoot = path.resolve(__dirname, '../../../../../../..');
    const absPath = path.resolve(backendRoot, filePath);
    
    console.log(`[${new Date().toISOString()}] 📂 API-SPEC: Loading API spec from ${absPath}`);
    
    try {
      const content = await fs.readFile(absPath, 'utf8');
      
      // Pretty-print JSON for better readability
      let prettyContent = content;
      try {
        const json = JSON.parse(content);
        prettyContent = JSON.stringify(json, null, 2);
      } catch (e) {
        console.warn(`[${new Date().toISOString()}] ⚠️ API-SPEC: Could not pretty-print JSON, using raw content`);
      }
      
      return {
        pageContent: prettyContent,
        metadata: { 
          source: filePath, 
          type: 'apiSpec',
          category: 'api_specification',
          priority: 'high',
          processedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ API-SPEC: Could not load API spec file at ${absPath}:`, error.message);
      return null;
    }
  }

  /**
   * Create endpoint-specific chunks from API specification
   */
  async chunkApiSpecEndpoints(apiSpecJson, documents) {
    console.log(`[${new Date().toISOString()}] 🔍 API-SPEC: Creating endpoint-specific documentation chunks`);
    
    if (!apiSpecJson.paths || typeof apiSpecJson.paths !== 'object') {
      console.log(`[${new Date().toISOString()}] ⚠️ API-SPEC: No paths found in API specification`);
      return;
    }

    let endpointCount = 0;
    Object.entries(apiSpecJson.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, operation]) => {
        if (typeof operation !== 'object') return;

        const endpoint = {
          method: method.toUpperCase(),
          path: path,
          summary: operation.summary || '',
          description: operation.description || '',
          tags: operation.tags || [],
          operationId: operation.operationId || ''
        };

        // Build comprehensive endpoint documentation
        let content = `API ENDPOINT: ${endpoint.method} ${endpoint.path}\n\n`;
        if (endpoint.summary) content += `Summary: ${endpoint.summary}\n`;
        if (endpoint.description) content += `Description: ${endpoint.description}\n`;
        if (endpoint.operationId) content += `Operation ID: ${endpoint.operationId}\n`;
        if (endpoint.tags.length > 0) content += `Tags: ${endpoint.tags.join(', ')}\n`;

        // Add parameters information
        if (operation.parameters && Array.isArray(operation.parameters)) {
          content += `\nParameters:\n`;
          operation.parameters.forEach(param => {
            content += `- ${param.name} (${param.in}): ${param.description || 'No description'} ${param.required ? '[Required]' : '[Optional]'}\n`;
          });
        }

        // Add request body information
        if (operation.requestBody) {
          content += `\nRequest Body:\n`;
          if (operation.requestBody.description) {
            content += `Description: ${operation.requestBody.description}\n`;
          }
          if (operation.requestBody.content) {
            Object.keys(operation.requestBody.content).forEach(mediaType => {
              content += `Content Type: ${mediaType}\n`;
            });
          }
        }

        // Add response information
        if (operation.responses && typeof operation.responses === 'object') {
          content += `\nResponses:\n`;
          Object.entries(operation.responses).forEach(([statusCode, response]) => {
            if (response.description) {
              content += `- ${statusCode}: ${response.description}\n`;
            }
          });
        }

        documents.push({
          pageContent: content,
          metadata: {
            source: 'httpApiSpec.json',
            type: 'api_endpoint',
            category: 'api_endpoint',
            method: method.toLowerCase(),
            path: path,
            tags: endpoint.tags,
            operationId: endpoint.operationId || `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
            priority: 'high',
            processedAt: new Date().toISOString()
          }
        });

        endpointCount++;
      });
    });

    console.log(`[${new Date().toISOString()}] ✅ API-SPEC: Created ${endpointCount} endpoint-specific chunks`);
  }

  /**
   * Create schema-specific chunks from API specification
   */
  async chunkApiSpecSchemas(apiSpecJson, documents) {
    console.log(`[${new Date().toISOString()}] 🔍 API-SPEC: Creating schema-specific documentation chunks`);
    
    if (!apiSpecJson.components?.schemas) {
      console.log(`[${new Date().toISOString()}] ⚠️ API-SPEC: No schemas found in API specification`);
      return;
    }

    let schemaCount = 0;
    Object.entries(apiSpecJson.components.schemas).forEach(([schemaName, schema]) => {
      let content = `API SCHEMA: ${schemaName}\n\n`;
      
      if (schema.description) {
        content += `Description: ${schema.description}\n`;
      }
      
      if (schema.type) {
        content += `Type: ${schema.type}\n`;
      }

      if (schema.properties) {
        content += `\nProperties:\n`;
        Object.entries(schema.properties).forEach(([propName, propDef]) => {
          content += `- ${propName}: ${propDef.type || 'unknown'} - ${propDef.description || 'No description'}\n`;
        });
      }

      if (schema.required && Array.isArray(schema.required)) {
        content += `\nRequired Fields: ${schema.required.join(', ')}\n`;
      }

      documents.push({
        pageContent: content,
        metadata: {
          source: 'httpApiSpec.json',
          type: 'api_schema',
          category: 'api_schema',
          schemaName: schemaName,
          schemaType: schema.type || 'object',
          priority: 'medium',
          processedAt: new Date().toISOString()
        }
      });

      schemaCount++;
    });

    console.log(`[${new Date().toISOString()}] ✅ API-SPEC: Created ${schemaCount} schema-specific chunks`);
  }

  /**
   * Store API specification documents in vector database
   */
  async storeApiSpecDocuments(documents, namespace) {
    console.log(`[${new Date().toISOString()}] 🗄️ API-SPEC STORAGE: Storing ${documents.length} API spec chunks in namespace '${namespace}'`);

    if (!this.pinecone) {
      console.warn(`[${new Date().toISOString()}] ⚠️ API-SPEC: Pinecone not available, skipping storage`);
      return;
    }

    try {
      const index = this.pinecone.Index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
      const vectorStore = new PineconeStore(this.embeddings, {
        pineconeIndex: index,
        namespace: namespace
      });

      // Generate unique IDs
      const documentIds = documents.map((doc, index) => {
        const sanitizedSource = this.repositoryManager.sanitizeId(doc.metadata.source || 'apispec');
        const sanitizedType = this.repositoryManager.sanitizeId(doc.metadata.type || 'unknown');
        return `system_apispec_${sanitizedSource}_${sanitizedType}_chunk_${index}`;
      });

      // Store with rate limiting if available
      if (this.pineconeLimiter) {
        await this.pineconeLimiter.schedule(async () => {
          await vectorStore.addDocuments(documents, { ids: documentIds });
        });
      } else {
        await vectorStore.addDocuments(documents, { ids: documentIds });
      }

      console.log(`[${new Date().toISOString()}] ✅ API-SPEC STORAGE: Successfully stored ${documents.length} API spec chunks`);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ API-SPEC STORAGE: Error storing documents:`, error.message);
      throw error;
    }
  }
}

module.exports = ApiSpecProcessor;
