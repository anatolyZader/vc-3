// pineconeService.js

const { PineconeStore } = require('@langchain/pinecone');
const PineconePlugin = require('./pineconePlugin');

class PineconeService {
  constructor(options = {}) {
    // Require PineconePlugin as a mandatory dependency to ensure singleton pattern
    if (!options.pineconePlugin) {
      throw new Error('PineconeService requires a pineconePlugin instance. Pass it via options.pineconePlugin');
    }
    
    this.pineconePlugin = options.pineconePlugin;
    
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
  }

  /**
   * Get Pinecone client via plugin
   */
  async getClient() {
    return await this.pineconePlugin.getClient();
  }

  /**
   * Get Pinecone index via plugin
   */
  async getIndex() {
    return await this.pineconePlugin.getIndex();
  }

  /**
   * Get connection status from plugin
   */
  isConnected() {
    return this.pineconePlugin.isConnected();
  }

  /**
   * Get configuration from plugin
   */
  getConfig() {
    return this.pineconePlugin.getConfig();
  }

  /**
   * Get index statistics
   */
  async getIndexStats() {
    return await this.pineconePlugin.getIndexStats();
  }



  /**
   * Create a PineconeStore for LangChain integration
   */
  async createVectorStore(embeddings, namespace = null) {
    const index = await this.getIndex();
    
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

    // Verbose logging removed to reduce noise and focus on errors

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
        await this.withRateLimit(async () => {
          await vectorStore.addDocuments(documents, addOptions);
        });
      }

      if (verbose) {
        console.log(`[${new Date().toISOString()}] ✅ DATA-PREP: Successfully stored ${documents.length} chunks to Pinecone namespace: ${namespace}`);
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
      const index = await this.getIndex();
      
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
      const index = await this.getIndex();
      
      this.logger.info(`Deleting ${ids.length} vectors`, { namespace });
      
      // Build delete options
      const deleteOptions = { ids };
      if (namespace) {
        deleteOptions.namespace = namespace;
      }
      
      // Use the delete method with namespace as parameter
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
      const index = await this.getIndex();
      
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
   * Clean up old repository embeddings by deleting vectors with older timestamps
   * This is a more targeted cleanup that preserves system docs while removing old repo versions
   */
  async cleanupOldRepositoryEmbeddings(namespace, options = {}) {
    const { keepLatestCount = 1, dryRun = false } = options;
    
    try {
      this.logger.info(`Cleaning up old repository embeddings in namespace: ${namespace}`);
      
      // Sample the namespace to find repository chunks
      const sampleQuery = await this.querySimilar(new Array(3072).fill(0.1), {
        namespace: namespace,
        topK: 100, // Get larger sample to identify patterns
        threshold: 0.0, // Include all results
        includeMetadata: true
      });

      if (!sampleQuery.matches || sampleQuery.matches.length === 0) {
        this.logger.info('No vectors found in namespace to clean up');
        return { success: true, deleted: 0, kept: 0 };
      }

      // Group by content hash (first 200 chars) to identify duplicates
      const contentGroups = new Map();
      
      sampleQuery.matches.forEach(match => {
        const content = match.metadata?.text || match.metadata?.content || '';
        const contentHash = content.substring(0, 200).trim();
        
        // Only process repository chunks (exclude system docs)
        if (match.id.includes('_chunk_') && !match.id.startsWith('system_')) {
          if (!contentGroups.has(contentHash)) {
            contentGroups.set(contentHash, []);
          }
          contentGroups.get(contentHash).push({
            id: match.id,
            timestamp: this.extractTimestampFromId(match.id)
          });
        }
      });

      // Identify vectors to delete (keep only the latest for each content group)
      const toDelete = [];
      let keptCount = 0;

      contentGroups.forEach((vectors, contentHash) => {
        if (vectors.length > keepLatestCount) {
          // Sort by timestamp (newest first)
          vectors.sort((a, b) => b.timestamp - a.timestamp);
          
          // Keep the latest, mark the rest for deletion
          for (let i = keepLatestCount; i < vectors.length; i++) {
            toDelete.push(vectors[i].id);
          }
          keptCount += keepLatestCount;
        } else {
          keptCount += vectors.length;
        }
      });

      this.logger.info(`Cleanup plan: ${toDelete.length} old vectors to delete, ${keptCount} vectors to keep`);

      if (dryRun) {
        this.logger.info('Dry run mode - no vectors will be deleted');
        return { success: true, deleted: 0, kept: keptCount, plannedDeletions: toDelete.length };
      }

      // Execute deletions in batches
      if (toDelete.length > 0) {
        const batchSize = 50;
        let deleted = 0;

        for (let i = 0; i < toDelete.length; i += batchSize) {
          const batch = toDelete.slice(i, i + batchSize);
          try {
            await this.deleteVectors(batch, namespace);
            deleted += batch.length;
          } catch (error) {
            this.logger.warn(`Failed to delete batch of ${batch.length} vectors:`, error.message);
          }
        }

        this.logger.info(`Successfully cleaned up ${deleted} old repository embeddings`);
        return { success: true, deleted, kept: keptCount };
      } else {
        this.logger.info('No old embeddings found to clean up');
        return { success: true, deleted: 0, kept: keptCount };
      }

    } catch (error) {
      this.logger.error(`Failed to cleanup old repository embeddings:`, error.message);
      throw error;
    }
  }

  /**
   * Extract timestamp from document ID
   */
  extractTimestampFromId(id) {
    const parts = id.split('_');
    const lastPart = parts[parts.length - 1];
    const timestamp = parseInt(lastPart);
    return isNaN(timestamp) ? 0 : timestamp;
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
   * Disconnect from Pinecone via plugin
   */
  async disconnect() {
    await this.pineconePlugin.disconnect();
    this.logger.info('Disconnected from Pinecone');
  }

  /**
   * Check if service is connected
   */
  isConnectedToIndex() {
    return this.pineconePlugin.isConnected();
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
   * Generate stable document IDs using content hash + metadata
   * IDs are deterministic based on content, allowing for reliable deduplication
   */
  static generateRepositoryDocumentIds(documents, namespace, options = {}) {
    const crypto = require('crypto');
    const { prefix = null, includeVersion = false } = options;
    
    return documents.map((doc, index) => {
      const sourceFile = doc.metadata?.source || 'unknown';
      const sanitizedSource = sourceFile
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/^(?:_+)|(?:_+)$/g, '');
      
      // Create stable content hash for deduplication
      const contentHash = crypto
        .createHash('sha256')
        .update(doc.pageContent || '')
        .digest('hex')
        .substring(0, 12); // First 12 chars for brevity
      
      const parts = [namespace, sanitizedSource, 'chunk', index, contentHash];
      if (prefix) parts.unshift(prefix);
      
      // Store version in metadata instead of ID
      if (includeVersion && doc.metadata) {
        doc.metadata.version = Date.now();
        doc.metadata.contentHash = contentHash;
      }
      
      return parts.join('_');
    });
  }

  /**
   * Generate stable document IDs for user repository chunks 
   * Uses same pattern as generateRepositoryDocumentIds for consistency
   */
  static generateUserRepositoryDocumentIds(documents, userId, repoId, options = {}) {
    const crypto = require('crypto');
    const { includeVersion = false } = options;
    
    return documents.map((doc, index) => {
      const sourceFile = doc.metadata?.source || 'unknown';
      const sanitizedSource = this.sanitizeId(sourceFile.replace(/\//g, '_'));
      
      // Create stable content hash
      const contentHash = crypto
        .createHash('sha256')
        .update(doc.pageContent || '')
        .digest('hex')
        .substring(0, 12);
      
      // Store version in metadata instead of ID
      if (includeVersion && doc.metadata) {
        doc.metadata.version = Date.now();
        doc.metadata.contentHash = contentHash;
      }
      
      return `${userId}_${repoId}_${sanitizedSource}_chunk_${index}_${contentHash}`;
    });
  }

  /**
   * Create a PineconeService instance from environment
   */
  static fromEnvironment(options = {}) {
    const PineconePlugin = require('./pineconePlugin');
    const pineconePlugin = new PineconePlugin(options);
    return new PineconeService({
      ...options,
      pineconePlugin: pineconePlugin
    });
  }
}

module.exports = PineconeService;