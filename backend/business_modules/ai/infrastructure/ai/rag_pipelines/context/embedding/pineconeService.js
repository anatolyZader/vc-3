// pineconeService.js
//
// DETERMINISTIC VECTOR IDS (Nov 2025)
// ====================================
// Vector IDs are now deterministic using content hash + source:
//   Format: namespace:source:contentHash (e.g. "my-repo:src_Button.js:a1b2c3d4")
// 
// Benefits:
//   ✅ Idempotent upserts: same content = same ID = automatic overwrite (no duplicates)
//   ✅ Simplified cleanup: only needed for deleted/renamed files (not duplicates)
//   ✅ Better performance: no sampling queries or duplicate detection
//   ✅ Easier debugging: ID tells you exactly what it contains
//
// See: DETERMINISTIC_VECTOR_IDS.md for full documentation

const { PineconeStore } = require('@langchain/pinecone');
const PineconePlugin = require('./pineconePlugin');
const MetadataFlattener = require('../chunking/metadataFlattener');

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
    
    // Try v0.2+ API signature first (embedding in config object)
    try {
      return await PineconeStore.fromExistingIndex({
        pineconeIndex: index,
        embedding: embeddings,
        ...(namespace ? { namespace } : {})
      });
    } catch (error) {
      // Fallback to legacy API signature (embeddings as first parameter)
      this.logger.debug('Using legacy PineconeStore API signature');
      return await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex: index,
        ...(namespace ? { namespace } : {})
      });
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

      // CRITICAL: Trim metadata BEFORE upsert to respect Pinecone's 40KB limit per vector
      const trimmedDocuments = documents.map(doc => {
        const result = MetadataFlattener.processForUpsert(doc.metadata);
        
        // Log validation warnings
        if (!result.validation.valid) {
          this.logger.warn(`Metadata issues for ${doc.metadata?.source || 'unknown'}:`, result.validation.issues);
        }
        
        return {
          ...doc,
          metadata: result.metadata
        };
      });

      if (verbose) {
        console.log(`[${new Date().toISOString()}] 🧹 METADATA_TRIMMING: Trimmed ${trimmedDocuments.length} documents to stay under 40KB Pinecone limit`);
      }

      const addOptions = {};
      if (ids) {
        addOptions.ids = ids;
      }

      // Process documents in batches if needed
      if (trimmedDocuments.length > batchSize) {
        let processed = 0;
        
        for (let i = 0; i < trimmedDocuments.length; i += batchSize) {
          const batch = trimmedDocuments.slice(i, i + batchSize);
          const batchIds = ids ? ids.slice(i, i + batchSize) : undefined;
          const batchOptions = batchIds ? { ids: batchIds } : {};

          await this.withRateLimit(async () => {
            await vectorStore.addDocuments(batch, batchOptions);
          });

          processed += batch.length;
          
          if (onProgress) {
            onProgress(processed, trimmedDocuments.length);
          }
          
          this.logger.debug(`Processed batch ${Math.floor(i / batchSize) + 1}`, {
            processed,
            total: trimmedDocuments.length
          });
        }
      } else {
        await this.withRateLimit(async () => {
          await vectorStore.addDocuments(trimmedDocuments, addOptions);
        });
      }

      if (verbose) {
        console.log(`[${new Date().toISOString()}] ✅ DATA-PREP: Successfully stored ${trimmedDocuments.length} chunks to Pinecone namespace: ${namespace}`);
      }

      this.logger.info(`Successfully upserted ${trimmedDocuments.length} documents`, { namespace });
      
      return {
        success: true,
        processed: trimmedDocuments.length,
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
   * Clean up old repository embeddings
   * 
   * With deterministic IDs (userId:repoId:source:contentHash), upserts are now idempotent.
   * Duplicates don't occur because same content = same ID = automatic overwrite.
   * 
   * Cleanup is only needed for:
   * 1. Deleted files (source no longer exists in repo)
   * 2. Renamed files (old source path should be removed)
   * 
   * For now, this is a simplified version that deletes the entire namespace
   * before re-indexing. Future enhancement: track file deletions/renames explicitly.
   */
  async cleanupOldRepositoryEmbeddings(namespace, options = {}) {
    const { dryRun = false } = options;
    
    try {
      this.logger.info(`Cleanup for namespace: ${namespace} (with deterministic IDs, upserts are idempotent)`);
      
      if (dryRun) {
        this.logger.info('Dry run mode - would delete namespace for fresh indexing');
        return { success: true, deleted: 0, kept: 0, mode: 'dry_run' };
      }

      // With deterministic IDs, we delete the entire namespace before re-indexing
      // This ensures deleted/renamed files are removed
      // Same-content files will have same IDs, so upsert overwrites automatically
      await this.deleteNamespace(namespace);
      
      this.logger.info(`Successfully cleaned namespace: ${namespace} (ready for fresh idempotent upserts)`);
      return { success: true, deleted: 'all', kept: 0, mode: 'full_namespace_reset' };

    } catch (error) {
      this.logger.error(`Failed to clean namespace ${namespace}:`, error.message);
      // Don't throw - might be first time processing this repo (namespace doesn't exist yet)
      return { success: false, deleted: 0, kept: 0, error: error.message };
    }
  }

  /**
   * Delete vectors for specific files (for handling file deletions/renames)
   * 
   * With deterministic IDs (namespace:source:contentHash), we can delete by prefix:
   * - Delete all vectors matching "namespace:source:*" pattern
   * 
   * Note: Pinecone doesn't support prefix-based deletion directly,
   * so we need to query first, then delete matching IDs.
   */
  async deleteVectorsForFiles(namespace, filePaths) {
    try {
      if (!filePaths || filePaths.length === 0) {
        this.logger.info('No files specified for deletion');
        return { success: true, deleted: 0 };
      }

      this.logger.info(`Deleting vectors for ${filePaths.length} files in namespace: ${namespace}`);
      
      const toDelete = [];
      
      // For each file, query to find all matching vector IDs
      for (const filePath of filePaths) {
        const sanitizedSource = this.sanitizeId(filePath.replace(/\//g, '_'));
        
        // Query with metadata filter for this source
        // Note: This is a workaround since Pinecone doesn't support prefix deletion
        const queryResult = await this.querySimilar(new Array(3072).fill(0.0), {
          namespace: namespace,
          topK: 1000, // Max vectors per file
          includeMetadata: true,
          filter: { source: filePath }
        });
        
        if (queryResult.matches && queryResult.matches.length > 0) {
          queryResult.matches.forEach(match => {
            // Only delete if ID matches our deterministic pattern
            if (match.id.includes(sanitizedSource)) {
              toDelete.push(match.id);
            }
          });
        }
      }

      if (toDelete.length > 0) {
        await this.deleteVectors(toDelete, namespace);
        this.logger.info(`Successfully deleted ${toDelete.length} vectors for ${filePaths.length} files`);
        return { success: true, deleted: toDelete.length };
      } else {
        this.logger.info('No vectors found to delete for specified files');
        return { success: true, deleted: 0 };
      }

    } catch (error) {
      this.logger.error(`Failed to delete vectors for files:`, error.message);
      throw error;
    }
  }

  /**
   * LEGACY METHOD - kept for backward compatibility
   * With deterministic IDs, duplicates don't occur (same content = same ID = overwrite)
   * This method now just logs a deprecation warning
   */
  async cleanupOldRepositoryEmbeddingsLegacy(namespace, options = {}) {
    this.logger.warn('cleanupOldRepositoryEmbeddingsLegacy called - this is deprecated with deterministic IDs');
    this.logger.info('With deterministic IDs (userId:repoId:source:contentHash), upserts are idempotent');
    this.logger.info('Duplicates are automatically prevented - cleanup only needed for deleted/renamed files');
    
    return { success: true, deleted: 0, kept: 0, mode: 'deprecated' };
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
   * Generate deterministic, idempotent document IDs based on content hash and source
   * Format: namespace:source:contentHash (deterministic - upsert overwrites automatically)
   * 
   * This approach eliminates duplicate detection needs:
   * - Same content + source = same ID → automatic overwrite on upsert
   * - Cleanup only needed for deleted/renamed files (not duplicates)
   * - Chunk index stored in metadata for ordering, not in ID
   */
  static generateRepositoryDocumentIds(documents, namespace, options = {}) {
    const crypto = require('crypto');
    
    return documents.map((doc, index) => {
      const sourceFile = doc.metadata?.source || 'unknown';
      const sanitizedSource = this.sanitizeId(sourceFile.replace(/\//g, '_'));
      
      // Create stable content hash for deterministic ID generation
      const contentHash = crypto
        .createHash('sha256')
        .update(doc.pageContent || '')
        .digest('hex')
        .substring(0, 16); // Use 16 chars for better uniqueness
      
      // Store chunk metadata for tracking (not in ID)
      if (doc.metadata) {
        doc.metadata.contentHash = contentHash;
        doc.metadata.chunkIndex = index; // Store index in metadata for ordering
        doc.metadata.version = Date.now(); // Timestamp for reference
      }
      
      // Deterministic ID: namespace:source:contentHash
      // Same content + source = same ID → idempotent upserts
      return `${namespace}:${sanitizedSource}:${contentHash}`;
    });
  }

  /**
   * Generate deterministic document IDs for user repository chunks
   * Format: userId:repoId:source:contentHash (idempotent - same content = same ID)
   * 
   * Matches generateRepositoryDocumentIds pattern for consistency
   */
  static generateUserRepositoryDocumentIds(documents, userId, repoId, options = {}) {
    const crypto = require('crypto');
    
    return documents.map((doc, index) => {
      const sourceFile = doc.metadata?.source || 'unknown';
      const sanitizedSource = this.sanitizeId(sourceFile.replace(/\//g, '_'));
      
      // Create stable content hash for deterministic ID generation
      const contentHash = crypto
        .createHash('sha256')
        .update(doc.pageContent || '')
        .digest('hex')
        .substring(0, 16); // Use 16 chars for better uniqueness
      
      // Store chunk metadata for tracking (not in ID)
      if (doc.metadata) {
        doc.metadata.contentHash = contentHash;
        doc.metadata.chunkIndex = index; // Store index in metadata for ordering
        doc.metadata.version = Date.now(); // Timestamp for reference
      }
      
      // Deterministic ID: userId:repoId:source:contentHash
      // Same content + source = same ID → idempotent upserts
      return `${userId}:${repoId}:${sanitizedSource}:${contentHash}`;
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