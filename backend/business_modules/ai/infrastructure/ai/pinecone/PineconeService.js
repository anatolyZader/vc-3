/**
 * PineconeService - Centralized Pinecone Vector Database Service
 * 
 * This service provides a clean, modern interface for all Pinecone operations
 * throughout the EventStorm application. It handles connection management,
 * error recovery, and provides consistent patterns for vector operations.
 */

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

      // Get index reference using the official pattern
      this.index = this.client.index(this.config.indexName);
      
      // Test connection by getting index stats
      await this.getIndexStats();
      
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
    const index = await this.connect();
    
    try {
      const stats = await index.describeIndexStats();
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
    
    const storeConfig = {
      pineconeIndex: index
    };

    if (namespace) {
      storeConfig.namespace = namespace;
      this.logger.debug(`Creating vector store with namespace: ${namespace}`);
    }

    return new PineconeStore(embeddings, storeConfig);
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
      onProgress = null
    } = options;

    if (!documents || documents.length === 0) {
      this.logger.warn('No documents provided for upsert');
      return { success: true, processed: 0 };
    }

    try {
      const vectorStore = await this.createVectorStore(embeddings, namespace);
      
      this.logger.info(`Upserting ${documents.length} documents`, {
        namespace,
        batchSize,
        hasCustomIds: !!ids
      });

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
        await this.withRateLimit(async () => {
          await vectorStore.addDocuments(documents, addOptions);
        });
      }

      this.logger.info(`Successfully upserted ${documents.length} documents`, { namespace });
      
      return {
        success: true,
        processed: documents.length,
        namespace
      };

    } catch (error) {
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

      if (namespace) {
        queryOptions.namespace = namespace;
      }

      if (filter) {
        queryOptions.filter = filter;
      }

      this.logger.debug('Querying similar vectors', {
        namespace,
        topK,
        hasFilter: !!filter
      });

      const results = await index.query(queryOptions);
      
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
      
      const deleteOptions = { ids };
      if (namespace) {
        deleteOptions.namespace = namespace;
      }

      this.logger.info(`Deleting ${ids.length} vectors`, { namespace });
      
      await index.deleteMany(deleteOptions);
      
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
      
      await index.deleteAll({ namespace });
      
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
   * Generate consistent document ID
   */
  static generateDocumentId(prefix, parts) {
    const sanitized = parts.map(part => 
      String(part).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()
    );
    return `${prefix}_${sanitized.join('_')}`;
  }

  /**
   * Create a PineconeService instance from environment
   */
  static fromEnvironment(options = {}) {
    return new PineconeService(options);
  }
}

module.exports = PineconeService;