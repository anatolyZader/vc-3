// pineconeService.js

const { Pinecone } = require('@pinecone-database/pinecone');
const { PineconeStore } = require('@langchain/pinecone');

class PineconeService {
  constructor(options = {}) {
    this.config = {
      apiKey: options.apiKey || process.env.PINECONE_API_KEY,
      indexName: options.indexName || process.env.PINECONE_INDEX_NAME || 'eventstorm-index',
      region: options.region || process.env.PINECONE_REGION || 'us-central1',
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
    };

    this.client = null;
    this.index = null;
    this.isConnected = false;
    this.connectionPromise = null;
    
    // Rate limiting for operations
    this.rateLimiter = options.rateLimiter || null;
    
    this.logger = {
      info: (msg, ...args) => console.log(`[PineconeService] ${msg}`, ...args),
      warn: (msg, ...args) => console.warn(`[PineconeService] ${msg}`, ...args),
      error: (msg, ...args) => console.error(`[PineconeService] ${msg}`, ...args),
      debug: (msg, ...args) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[PineconeService:DEBUG] ${msg}`, ...args);
        }
      }
    };

    this.validateConfig();
  }

  /**
   * Validate configuration and environment variables
   */
  validateConfig() {
    if (!this.config.apiKey) {
      throw new Error('PINECONE_API_KEY is required');
    }

    if (!this.config.indexName) {
      throw new Error('PINECONE_INDEX_NAME is required');
    }

    this.logger.debug('Configuration validated', {
      indexName: this.config.indexName,
      region: this.config.region,
      hasApiKey: !!this.config.apiKey
    });
  }

  /**
   * Initialize connection to Pinecone
   */
  async connect() {
    if (this.isConnected) {
      return this.index;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._doConnect();
    return this.connectionPromise;
  }

  async _doConnect() {
    try {
      this.logger.info('Connecting to Pinecone...');
      
      // Initialize Pinecone client following official API patterns
      this.client = new Pinecone({
        apiKey: this.config.apiKey
      });

      // Check if index exists, create if it doesn't
      try {
        const existingIndexes = await this.client.listIndexes();
        const indexExists = existingIndexes.indexes?.some(idx => idx.name === this.config.indexName);
        
        if (!indexExists) {
          this.logger.info(`Index ${this.config.indexName} doesn't exist, creating it...`);
          await this.createIndex();
        }
      } catch (listError) {
        this.logger.warn('Could not check existing indexes, attempting to create index:', listError.message);
        try {
          await this.createIndex();
        } catch (createError) {
          // If creation also fails, it might already exist, continue
          this.logger.debug('Index creation failed, assuming it exists:', createError.message);
        }
      }

      // Get index reference using the official pattern
      this.index = this.client.index(this.config.indexName);
      
      this.isConnected = true;
      this.logger.info(`Successfully connected to Pinecone index: ${this.config.indexName}`);
      
      return this.index;
    } catch (error) {
      this.logger.error('Failed to connect to Pinecone:', error.message);
      this.isConnected = false;
      this.connectionPromise = null;
      throw new Error(`Pinecone connection failed: ${error.message}`);
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats() {
    if (!this.isConnected || !this.index) {
      await this.connect();
    }
    
    try {
      const stats = await this.index.describeIndexStats();
      this.logger.debug('Index stats retrieved', {
        totalVectors: stats.totalVectorCount || 0,
        namespaces: Object.keys(stats.namespaces || {}).length
      });
      return stats;
    } catch (error) {
      this.logger.error('Failed to get index stats:', error.message);
      throw error;
    }
  }

  /**
   * Create index following official Pinecone API patterns
   */
  async createIndex(options = {}) {
    const {
      cloud = 'gcp',
      region = this.config.region,
      dimension = 3072, // For text-embedding-3-large
      metric = 'cosine',
      waitUntilReady = true
    } = options;

    try {
      this.logger.info(`Creating Pinecone index: ${this.config.indexName}`);

      // Check if index already exists
      try {
        const existingIndexes = await this.client.listIndexes();
        const indexExists = existingIndexes.indexes?.some(idx => idx.name === this.config.indexName);
        
        if (indexExists) {
          this.logger.info(`Index ${this.config.indexName} already exists`);
          return { success: true, existed: true };
        }
      } catch (error) {
        this.logger.debug('Could not check existing indexes:', error.message);
      }

      // Create index with serverless spec (following official docs)
      await this.client.createIndex({
        name: this.config.indexName,
        dimension,
        metric,
        spec: {
          serverless: {
            cloud,
            region
          }
        }
      });

      this.logger.info(`Index ${this.config.indexName} created successfully`);

      if (waitUntilReady) {
        this.logger.info('Waiting for index to be ready...');
        // Wait for index to be ready (typically takes 30-60 seconds)
        await this._waitForIndexReady();
      }

      return { success: true, created: true };

    } catch (error) {
      this.logger.error('Failed to create index:', error.message);
      throw error;
    }
  }

  /**
   * Wait for index to be ready
   */
  async _waitForIndexReady(maxWaitTime = 120000) { // 2 minutes max
    const startTime = Date.now();
    const checkInterval = 5000; // Check every 5 seconds

    while (Date.now() - startTime < maxWaitTime) {
      try {
        await this.getIndexStats();
        this.logger.info('Index is ready!');
        return true;
      } catch (error) {
        this.logger.debug('Index not ready yet, waiting...');
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }

    throw new Error(`Index ${this.config.indexName} did not become ready within ${maxWaitTime}ms`);
  }

  /**
   * Create a PineconeStore for LangChain integration
   */
  async createVectorStore(embeddings, namespace = null) {
    const index = await this.connect();
    
    // Use the newer LangChain API pattern for better compatibility
    const storeConfig = {
      pineconeIndex: index,
      embeddings: embeddings
    };

    if (namespace) {
      storeConfig.namespace = namespace;
      this.logger.debug(`Creating vector store with namespace: ${namespace}`);
    }

    // Try newer API first, fallback to legacy constructor if needed
    try {
      return await PineconeStore.fromExistingIndex(embeddings, storeConfig);
    } catch (error) {
      this.logger.debug('Using legacy PineconeStore constructor');
      return new PineconeStore(embeddings, storeConfig);
    }
  }

  /**
   * Execute a function with rate limiting if available
   */
  async withRateLimit(operation) {
    if (this.rateLimiter) {
      return this.rateLimiter.schedule(operation);
    }
    return operation();
  }

  /**
   * Upsert documents to Pinecone with proper error handling and rate limiting
   */
  async upsertDocuments(documents, embeddings, options = {}) {
    const {
      namespace = null,
      ids = null,
      batchSize = 100,
      onProgress = null,
      githubOwner = null,
      repoName = null,
      verbose = false,
      logPrefix = '[PineconeService]'
    } = options;

    if (!documents || documents.length === 0) {
      if (verbose) {
        console.log(`[${new Date().toISOString()}] ⚠️ DATA-PREP: No documents to store in Pinecone`);
        console.log(`[${new Date().toISOString()}] 🎯 This usually means no processable files were found in the repository`);
      }
      this.logger.warn('No documents provided for upsert');
      return { success: true, processed: 0 };
    }

    if (verbose && githubOwner && repoName) {
      console.log(`[${new Date().toISOString()}] 🗄️ PINECONE STORAGE EXPLANATION: Converting ${documents.length} document chunks into searchable vector embeddings`);
      console.log(`[${new Date().toISOString()}] 🎯 Each document chunk will be processed by OpenAI's text-embedding-3-large model to create high-dimensional vectors that capture semantic meaning. These vectors are then stored in Pinecone with unique IDs and metadata for lightning-fast similarity search during RAG queries`);
      console.log(`[${new Date().toISOString()}] 🎯 STORAGE STRATEGY: Using namespace '${namespace}' for data isolation and generating unique IDs for ${documents.length} chunks from ${githubOwner}/${repoName}`);
    }

    try {
      const vectorStore = await this.createVectorStore(embeddings, namespace);
      
      this.logger.info(`Upserting ${documents.length} documents`, {
        namespace,
        batchSize,
        hasCustomIds: !!ids,
        repo: repoName ? `${githubOwner}/${repoName}` : undefined
      });

      if (verbose) {
        console.log(`[${new Date().toISOString()}] 🔑 ID GENERATION: Creating unique identifiers to prevent collisions and enable precise retrieval`);
        console.log(`[${new Date().toISOString()}] ⚡ RATE LIMITING: Using bottleneck limiter to respect Pinecone API limits and prevent throttling`);
      }

      const addOptions = {};
      if (ids) {
        addOptions.ids = ids;
      }

      // Process documents in batches if needed
      if (documents.length > batchSize) {
        let processed = 0;
        
        for (let i = 0; i < documents.length; i += batchSize) {
          const batch = documents.slice(i, i + batchSize);
          const batchIds = ids ? ids.slice(i, i + batchSize) : undefined;
          const batchOptions = batchIds ? { ids: batchIds } : {};

          await this.withRateLimit(async () => {
            await vectorStore.addDocuments(batch, batchOptions);
          });

          processed += batch.length;
          
          if (onProgress) {
            onProgress(processed, documents.length);
          }
          
          this.logger.debug(`Processed batch ${Math.floor(i / batchSize) + 1}`, {
            processed,
            total: documents.length
          });
        }
      } else {
        if (verbose) {
          console.log(`[${new Date().toISOString()}] 🚀 EMBEDDING & UPLOAD: Processing ${documents.length} chunks${this.rateLimiter ? ' with rate limiter' : ' directly (no rate limiter)'}`);
        }
        
        await this.withRateLimit(async () => {
          await vectorStore.addDocuments(documents, addOptions);
        });
      }

      if (verbose) {
        console.log(`[${new Date().toISOString()}] ✅ DATA-PREP: Successfully stored ${documents.length} chunks to Pinecone namespace: ${namespace}`);
        console.log(`[${new Date().toISOString()}] 🎯 STORAGE COMPLETE: Vector embeddings are now searchable via semantic similarity queries in the RAG pipeline`);
        console.log(`[${new Date().toISOString()}] 📊 Each chunk includes rich metadata (file types, business modules, architectural layers, AST semantic units) for precise context retrieval`);
      }

      this.logger.info(`Successfully upserted ${documents.length} documents`, { namespace });
      
      return {
        success: true,
        processed: documents.length,
        namespace,
        documentIds: ids
      };

    } catch (error) {
      if (verbose) {
        console.error(`[${new Date().toISOString()}] ❌ DATA-PREP: Error storing documents to Pinecone:`, error);
        console.error(`[${new Date().toISOString()}] 💡 This may be due to API limits, network issues, or invalid document format`);
      }
      this.logger.error('Failed to upsert documents:', error.message);
      throw error;
    }
  }

  /**
   * Query similar documents from Pinecone
   */
  async querySimilar(queryEmbedding, options = {}) {
    const {
      namespace = null,
      topK = 10,
      filter = null,
      includeMetadata = true,
      includeValues = false
    } = options;

    try {
      const index = await this.connect();
      
      const queryOptions = {
        vector: queryEmbedding,
        topK,
        includeMetadata,
        includeValues
      };

      if (filter) {
        queryOptions.filter = filter;
      }

      this.logger.debug('Querying similar vectors', {
        namespace,
        topK,
        hasFilter: !!filter
      });

      // Use namespace method if namespace is provided
      const queryTarget = namespace ? index.namespace(namespace) : index;
      const results = await queryTarget.query(queryOptions);
      
      this.logger.debug(`Query returned ${results.matches?.length || 0} matches`);
      
      return results;

    } catch (error) {
      this.logger.error('Failed to query similar vectors:', error.message);
      throw error;
    }
  }

  /**
   * Delete vectors by IDs
   */
  async deleteVectors(ids, namespace = null) {
    try {
      const index = await this.connect();
      
      const deleteOptions = namespace ? { ids, namespace } : { ids };

      this.logger.info(`Deleting ${ids.length} vectors`, { namespace });
      
      // Pinecone serverless SDK: index.delete({ ids, namespace })
      await index.delete(deleteOptions);
      
      this.logger.info(`Successfully deleted ${ids.length} vectors`);
      
      return { success: true, deleted: ids.length };

    } catch (error) {
      this.logger.error('Failed to delete vectors:', error.message);
      throw error;
    }
  }

  /**
   * Delete all vectors in a namespace
   */
  async deleteNamespace(namespace) {
    try {
      const index = await this.connect();
      
      this.logger.info(`Deleting all vectors in namespace: ${namespace}`);
      // Pinecone serverless SDK: index.delete({ deleteAll: true, namespace })
      await index.delete({ deleteAll: true, namespace });
      
      this.logger.info(`Successfully deleted namespace: ${namespace}`);
      
      return { success: true, namespace };

    } catch (error) {
      this.logger.error(`Failed to delete namespace ${namespace}:`, error.message);
      throw error;
    }
  }

  /**
   * List all namespaces in the index
   */
  async listNamespaces() {
    try {
      const stats = await this.getIndexStats();
      const namespaces = Object.keys(stats.namespaces || {});
      
      this.logger.debug(`Found ${namespaces.length} namespaces`);
      
      return namespaces.map(ns => ({
        name: ns,
        vectorCount: stats.namespaces[ns]?.vectorCount || 0
      }));

    } catch (error) {
      this.logger.error('Failed to list namespaces:', error.message);
      throw error;
    }
  }

  /**
   * Get namespace statistics
   */
  async getNamespaceStats(namespace) {
    try {
      const stats = await this.getIndexStats();
      const namespaceStats = stats.namespaces?.[namespace];
      
      if (!namespaceStats) {
        return null;
      }

      return {
        name: namespace,
        vectorCount: namespaceStats.vectorCount || 0
      };

    } catch (error) {
      this.logger.error(`Failed to get stats for namespace ${namespace}:`, error.message);
      throw error;
    }
  }

  /**
   * Disconnect from Pinecone
   */
  async disconnect() {
    this.client = null;
    this.index = null;
    this.isConnected = false;
    this.connectionPromise = null;
    this.logger.info('Disconnected from Pinecone');
  }

  /**
   * Check if service is connected
   */
  isConnectedToIndex() {
    return this.isConnected;
  }

  /**
   * Sanitize identifier for use as Pinecone namespace or ID
   */
  static sanitizeId(id) {
    return String(id).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  }

  /**
   * Generate consistent document ID
   */
  static generateDocumentId(prefix, parts) {
    const sanitized = parts.map(part => 
      this.sanitizeId(part)
    );
    return `${prefix}_${sanitized.join('_')}`;
  }

  /**
   * Generate document IDs for repository chunks (compatible with RepoProcessor format)
   */
  static generateRepositoryDocumentIds(documents, namespace, options = {}) {
    const { useTimestamp = true, prefix = null } = options;
    
    return documents.map((doc, index) => {
      const sourceFile = doc.metadata?.source || 'unknown';
      const sanitizedSource = sourceFile
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/^(?:_+)|(?:_+)$/g, '');
      
      const parts = [namespace, sanitizedSource, 'chunk', index];
      if (prefix) parts.unshift(prefix);
      if (useTimestamp) parts.push(Date.now());
      
      return parts.join('_');
    });
  }

  /**
   * Generate document IDs for user repository chunks 
   */
  static generateUserRepositoryDocumentIds(documents, userId, repoId, options = {}) {
    return documents.map((doc, index) => {
      const sourceFile = doc.metadata?.source || 'unknown';
      const sanitizedSource = this.sanitizeId(sourceFile.replace(/\//g, '_'));
      return `${userId}_${repoId}_${sanitizedSource}_chunk_${index}`;
    });
  }

  /**
   * Create a PineconeService instance from environment
   */
  static fromEnvironment(options = {}) {
    return new PineconeService(options);
  }
}

module.exports = PineconeService;