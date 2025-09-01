const { MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { PineconeStore } = require('@langchain/pinecone');

/**
 * CoreDocsIndexer handles the indexing of core documentation to Pinecone
 * Includes API specs, markdown files, and specialized chunking strategies
 */
class CoreDocsIndexer {
  constructor(embeddings, pinecone) {
    this.embeddings = embeddings;
    this.pinecone = pinecone;
  }

  /**
   * Index core documentation to Pinecone (API specs and markdown files)
   * @param {string} namespace - Pinecone namespace
   * @param {boolean} clearFirst - Whether to clear existing core docs first
   */
  async indexCoreDocsToPinecone(namespace, clearFirst = false) {
    console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] Starting core docs indexing to namespace: ${namespace}`);
    
    if (this.pinecone) {
      try {
        if (clearFirst) {
          console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] Clearing existing core docs first...`);
          try {
            const filter = { type: { $in: ['apiSpec', 'api_endpoint', 'api_schema', 'root_documentation', 'architecture_documentation', 'module_documentation'] } };
            await this.pinecone.deleteMany(filter, namespace);
            console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] Successfully cleared existing core docs`);
          } catch (clearError) {
            console.warn(`[${new Date().toISOString()}] ⚠️ [RAG-INDEX] Warning during clear operation:`, clearError.message);
          }
        }

        const documents = [];

        // Load API spec file and add as document
        const apiSpecDoc = await this.loadApiSpec('httpApiSpec.json');
        if (apiSpecDoc) {
          documents.push(apiSpecDoc);
          console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] Loaded API spec file`);

          // Parse and create endpoint-specific chunks
          try {
            const apiSpecJson = JSON.parse(apiSpecDoc.pageContent);
            await this.chunkApiSpecEndpoints(apiSpecJson, documents);
            await this.chunkApiSpecSchemas(apiSpecJson, documents);
          } catch (parseError) {
            console.warn(`[${new Date().toISOString()}] ⚠️ [RAG-INDEX] Could not parse API spec for chunking:`, parseError.message);
          }
        }

        // Load markdown documentation files
        const markdownDocs = await this.loadMarkdownFiles();
        if (markdownDocs && markdownDocs.length > 0) {
          const splitMarkdownDocs = await this.splitMarkdownDocuments(markdownDocs);
          documents.push(...splitMarkdownDocs);
          console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] Split ${markdownDocs.length} markdown files into ${splitMarkdownDocs.length} chunks`);
        }

        if (documents.length === 0) {
          console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] No documents to index`);
          return;
        }

        console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] Preparing to index ${documents.length} core documents...`);

        // Generate unique IDs for Pinecone
        const documentIds = documents.map((doc, index) =>
          `system_core_docs_${this.sanitizeId(doc.metadata.type || doc.metadata.source || 'unknown')}_chunk_${index}`
        );

        // Store documents directly to Pinecone
        try {
          const coreDocsIndex = this.pinecone.Index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
          const vectorStore = new PineconeStore(this.embeddings, {
            pineconeIndex: coreDocsIndex,
            namespace: namespace
          });
          
          await vectorStore.addDocuments(documents, { ids: documentIds });
          console.log(`[${new Date().toISOString()}] ✅ [RAG-INDEX] Successfully stored ${documents.length} core documents to Pinecone namespace: ${namespace}`);
          
        } catch (storageError) {
          console.error(`[${new Date().toISOString()}] ❌ [RAG-INDEX] Error storing documents to Pinecone:`, storageError.message);
          throw storageError;
        }

        console.log(`[${new Date().toISOString()}] ✅ [RAG-INDEX] Successfully indexed ${documents.length} core documents to Pinecone namespace: ${namespace}`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ [RAG-INDEX] Error indexing core docs to Pinecone:`, error);
      }
    } else {
      console.warn(`[${new Date().toISOString()}] ⚠️ [RAG-INDEX] Pinecone client not initialized, cannot index core docs.`);
    }
  }

  /**
   * Load JSON spec file from backend root
   * @param {string} filePath - Relative path to the spec file
   * @returns {Object|null} Document object or null if error
   */
  async loadApiSpec(filePath) {
    const fs = require('fs');
    const path = require('path');
    const backendRoot = path.resolve(__dirname, '../../../../../..');
    const absPath = path.resolve(backendRoot, filePath);
    
    try {
      const content = await fs.promises.readFile(absPath, 'utf8');
      // Optionally parse and pretty-print JSON
      let prettyContent = content;
      try {
        const json = JSON.parse(content);
        prettyContent = JSON.stringify(json, null, 2);
      } catch (e) {}
      
      return {
        pageContent: prettyContent,
        metadata: { source: 'httpApiSpec.json', type: 'apiSpec' }
      };
    } catch (err) {
      console.warn(`[${new Date().toISOString()}] Could not load API spec file at ${absPath}: ${err.message}`);
      return null;
    }
  }

  /**
   * Load markdown files from root directory and business modules
   * @returns {Array} Array of markdown document objects
   */
  async loadMarkdownFiles() {
    const fs = require('fs');
    const path = require('path');
    const markdownDocs = [];
    
    try {
      const backendRoot = path.resolve(__dirname, '../../../../../..');
      
      // Load ROOT_DOCUMENTATION.md from backend root if it exists
      const rootDocPath = path.join(backendRoot, 'ROOT_DOCUMENTATION.md');
      try {
        const rootDocContent = await fs.promises.readFile(rootDocPath, 'utf8');
        markdownDocs.push({
          pageContent: rootDocContent,
          metadata: { 
            source: 'ROOT_DOCUMENTATION.md', 
            type: 'root_documentation',
            priority: 'high'
          }
        });
        console.log(`[${new Date().toISOString()}] [DEBUG] Loaded root documentation file`);
      } catch (err) {
        console.log(`[${new Date().toISOString()}] [DEBUG] No root documentation file found at ${rootDocPath}`);
      }

      // Load ARCHITECTURE.md from backend root if it exists
      const archDocPath = path.join(backendRoot, 'ARCHITECTURE.md');
      try {
        const archDocContent = await fs.promises.readFile(archDocPath, 'utf8');
        markdownDocs.push({
          pageContent: archDocContent,
          metadata: { 
            source: 'ARCHITECTURE.md', 
            type: 'architecture_documentation',
            priority: 'high'
          }
        });
        console.log(`[${new Date().toISOString()}] [DEBUG] Loaded architecture documentation file`);
      } catch (err) {
        console.log(`[${new Date().toISOString()}] [DEBUG] No architecture documentation file found at ${archDocPath}`);
      }

      // Load markdown files from business modules
      const businessModulesPath = path.join(backendRoot, 'business_modules');
      
      try {
        const modules = await fs.promises.readdir(businessModulesPath, { withFileTypes: true });
        
        for (const module of modules) {
          if (module.isDirectory()) {
            const modulePath = path.join(businessModulesPath, module.name);
            const moduleMarkdownPath = path.join(modulePath, `${module.name}.md`);
            
            try {
              const moduleContent = await fs.promises.readFile(moduleMarkdownPath, 'utf8');
              markdownDocs.push({
                pageContent: moduleContent,
                metadata: { 
                  source: `business_modules/${module.name}/${module.name}.md`, 
                  type: 'module_documentation',
                  module: module.name,
                  priority: 'medium'
                }
              });
              console.log(`[${new Date().toISOString()}] [DEBUG] Loaded ${module.name} module documentation`);
            } catch (err) {
              console.log(`[${new Date().toISOString()}] [DEBUG] No documentation file found for module ${module.name} at ${moduleMarkdownPath}`);
            }
          }
        }
      } catch (err) {
        console.warn(`[${new Date().toISOString()}] Could not read business modules directory: ${err.message}`);
      }

      // Sort by priority (high priority first)
      markdownDocs.sort((a, b) => {
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        return priorityOrder[a.metadata.priority] - priorityOrder[b.metadata.priority];
      });

      console.log(`[${new Date().toISOString()}] [DEBUG] Loaded ${markdownDocs.length} total markdown documentation files`);
      return markdownDocs;
      
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Error loading markdown files: ${err.message}`);
      return [];
    }
  }

  /**
   * Enhanced API spec chunking - creates endpoint-specific chunks
   * @param {Object} apiSpecJson - Parsed API specification
   * @param {Array} documents - Array to add chunks to
   */
  async chunkApiSpecEndpoints(apiSpecJson, documents) {
    if (!apiSpecJson.paths || typeof apiSpecJson.paths !== 'object') {
      console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] No paths found in API spec`);
      return;
    }

    let endpointCount = 0;
    Object.entries(apiSpecJson.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, operation]) => {
        if (typeof operation !== 'object') return; // Skip non-operation entries

        const endpoint = {
          method: method.toUpperCase(),
          path: path,
          summary: operation.summary || '',
          description: operation.description || '',
          tags: operation.tags || [],
          operationId: operation.operationId || ''
        };

        // Build comprehensive endpoint documentation
        let content = `${endpoint.method} ${endpoint.path}\n`;
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
              content += `Media Type: ${mediaType}\n`;
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
            method: method.toLowerCase(),
            path: path,
            tags: endpoint.tags,
            operationId: endpoint.operationId || `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`
          }
        });

        endpointCount++;
      });
    });

    console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] Created ${endpointCount} endpoint-specific chunks`);
  }

  /**
   * Enhanced API spec schema chunking - creates component schema chunks
   * @param {Object} apiSpecJson - Parsed API specification
   * @param {Array} documents - Array to add chunks to
   */
  async chunkApiSpecSchemas(apiSpecJson, documents) {
    if (!apiSpecJson.components || !apiSpecJson.components.schemas) {
      console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] No schemas found in API spec components`);
      return;
    }

    let schemaCount = 0;
    Object.entries(apiSpecJson.components.schemas).forEach(([schemaName, schema]) => {
      let content = `Schema: ${schemaName}\n`;
      if (schema.type) content += `Type: ${schema.type}\n`;
      if (schema.description) content += `Description: ${schema.description}\n`;

      // Add properties information
      if (schema.properties && typeof schema.properties === 'object') {
        content += `\nProperties:\n`;
        Object.entries(schema.properties).forEach(([propName, propSchema]) => {
          const required = schema.required && schema.required.includes(propName) ? '[Required]' : '[Optional]';
          const type = propSchema.type || 'unknown';
          const description = propSchema.description || 'No description';
          content += `- ${propName} (${type}): ${description} ${required}\n`;
        });
      }

      // Add enum values if present
      if (schema.enum && Array.isArray(schema.enum)) {
        content += `\nPossible Values: ${schema.enum.join(', ')}\n`;
      }

      documents.push({
        pageContent: content,
        metadata: {
          source: 'httpApiSpec.json',
          type: 'api_schema',
          schemaName: schemaName,
          schemaType: schema.type || 'object'
        }
      });

      schemaCount++;
    });

    console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] Created ${schemaCount} schema-specific chunks`);
  }

  /**
   * Enhanced markdown splitting using header-aware splitter
   * @param {Array} markdownDocs - Array of markdown documents
   * @returns {Array} Array of split documents
   */
  async splitMarkdownDocuments(markdownDocs) {
    const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
    const splittedDocs = [];

    for (const doc of markdownDocs) {
      try {
        // Try header-based splitting first
        const headerSplitter = new MarkdownHeaderTextSplitter({
          headersToSplitOn: [
            { level: 1, name: 'h1' },
            { level: 2, name: 'h2' },
            { level: 3, name: 'h3' }
          ]
        });

        const headerChunks = await headerSplitter.splitDocuments([doc]);
        
        if (headerChunks.length > 1) {
          // Header splitting was successful
          headerChunks.forEach((chunk, index) => {
            const enhancedMetadata = {
              ...doc.metadata,
              chunkIndex: index,
              splitterType: 'header-based'
            };

            // Extract section information from metadata
            if (chunk.metadata) {
              Object.keys(chunk.metadata).forEach(key => {
                if (key.startsWith('h') && chunk.metadata[key]) {
                  enhancedMetadata.section = chunk.metadata[key];
                  enhancedMetadata.sectionLevel = key;
                }
              });
            }

            splittedDocs.push({
              ...chunk,
              metadata: enhancedMetadata
            });
          });

          console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] Split ${doc.metadata.source} into ${headerChunks.length} header-based chunks`);
        } else {
          // Fallback to character-based splitting
          const charSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1500,
            chunkOverlap: 250
          });

          const charChunks = await charSplitter.splitDocuments([doc]);
          charChunks.forEach((chunk, index) => {
            splittedDocs.push({
              ...chunk,
              metadata: {
                ...doc.metadata,
                chunkIndex: index,
                splitterType: 'character-based'
              }
            });
          });

          console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] Split ${doc.metadata.source} into ${charChunks.length} character-based chunks (header splitting failed)`);
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error splitting markdown doc ${doc.metadata.source}:`, error.message);
        // Add the original document if splitting fails
        splittedDocs.push({
          ...doc,
          metadata: {
            ...doc.metadata,
            splitterType: 'none',
            error: 'splitting_failed'
          }
        });
      }
    }

    return splittedDocs;
  }

  /**
   * Sanitize string for use as Pinecone document ID
   * @param {string} input - Input string to sanitize
   * @returns {string} Sanitized string safe for use as document ID
   */
  sanitizeId(input) {
    return input.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
  }
}

module.exports = CoreDocsIndexer;
