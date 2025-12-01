// EmbeddingManager.js
"use strict";

const { Document } = require('langchain/document');

/**
 * Handles all embedding and vector storage operations with PostgreSQL pgvector
 * Uses centralized PGVectorService for all vector operations
 * Added token-based safety validation to prevent embedding API failures
 */
class EmbeddingManager {
  constructor(options = {}) {
    this.embeddings = options.embeddings;
    
    // Require PGVectorService
    if (!options.pgVectorService) {
      throw new Error('EmbeddingManager requires a pgVectorService instance. Pass it via options.pgVectorService');
    }
    
    this.pgVectorService = options.pgVectorService;
    this.vectorService = this.pgVectorService;
  }

  async _getVectorService() {
    return this.vectorService;
  }

  /**
   * Store documents to PostgreSQL pgvector database
   * NOTE: Safety rechunking enabled ONLY for oversized chunks (>8000 tokens)
   * Preserves semantic metadata by copying it to all sub-chunks
   */
  async storeToVectorDB(documents, namespace, githubOwner, repoName) {
    const vectorService = await this._getVectorService();
    if (!vectorService) {
      console.warn(`[${new Date().toISOString()}] ⚠️ DATA-PREP: Vector database service unavailable (skipping vector storage)`);
      return;
    }

    if (!documents || documents.length === 0) {
      return;
    }

    try {
      // SAFETY VALIDATION: Check for oversized chunks that would fail embedding API
      // Embedding API limit: 8191 tokens. We use 8000 as safety threshold.
      const { TokenTextSplitter } = require('langchain/text_splitter');
      const tokenValidator = new TokenTextSplitter({
        encodingName: 'cl100k_base',
        chunkSize: 8000,
        chunkOverlap: 200
      });

      const safeDocuments = [];
      let rechunkedCount = 0;
      
      for (const doc of documents) {
        const tokenCheck = await tokenValidator.splitDocuments([doc]);
        
        if (tokenCheck.length > 1) {
          // This chunk exceeds 8000 tokens - need to split it
          rechunkedCount++;
          console.warn(`[${new Date().toISOString()}] ⚠️ SAFETY RECHUNK: Document too large (${doc.pageContent.length} chars), splitting to ${tokenCheck.length} sub-chunks`);
          console.warn(`[${new Date().toISOString()}]    File: ${doc.metadata.filePath}, preserving semantic metadata`);
          
          // Create sub-chunks with preserved metadata
          for (let subIndex = 0; subIndex < tokenCheck.length; subIndex++) {
            const subChunk = tokenCheck[subIndex];
            safeDocuments.push(new Document({
              pageContent: subChunk.pageContent,
              metadata: {
                ...doc.metadata, // Preserve ALL original metadata including semantic tags
                rechunked: true,
                originalChunkIndex: doc.metadata.chunkIndex,
                subChunkIndex: subIndex,
                subChunkTotal: tokenCheck.length
              }
            }));
          }
        } else {
          // Chunk is safe - use as-is with all semantic metadata intact
          safeDocuments.push(doc);
        }
      }
      
      if (rechunkedCount > 0) {
        console.log(`[${new Date().toISOString()}] 📦 SAFETY VALIDATION: ${rechunkedCount} oversized chunks split, ${documents.length - rechunkedCount} chunks used as-is`);
        console.log(`[${new Date().toISOString()}] 📦 SEMANTIC PRESERVATION: All ${safeDocuments.length} chunks have semantic metadata preserved`);
      } else {
        console.log(`[${new Date().toISOString()}] 📦 SEMANTIC PRESERVATION: All ${documents.length} AST-chunked documents are safe (<8000 tokens)`);
      }
      
      // Import pgvector service class for static methods
      const PGVectorService = require('./pgVectorService');
      
      // Generate deterministic, idempotent document IDs (contentHash + source = unique stable key)
      // Same content + source = same ID → upsert automatically overwrites (no duplicates)
      const documentIds = PGVectorService.generateRepositoryDocumentIds(safeDocuments, namespace);

      console.log(`[${new Date().toISOString()}] 📝 STORING TO VECTOR DB: Processing ${safeDocuments.length} semantically-rich documents`);
      console.log(`[${new Date().toISOString()}] 🔑 IDEMPOTENT IDS: Using deterministic IDs (namespace:source:contentHash) - upserts overwrite automatically`);

      // CLEANUP: With deterministic IDs, cleanup is only needed for full re-indexing
      // Incremental updates will automatically overwrite matching IDs
      console.log(`[${new Date().toISOString()}] 🧹 CLEANUP: Clearing namespace for fresh indexing (deterministic IDs prevent duplicates)`);
      try {
        const cleanupResult = await vectorService.cleanupOldRepositoryEmbeddings(namespace, {
          dryRun: false
        });
        console.log(`[${new Date().toISOString()}] ✅ CLEANUP: ${cleanupResult.mode === 'full_namespace_reset' || cleanupResult.mode === 'full_collection_reset' ? 'Namespace cleared' : 'Cleanup completed'}`);
      } catch (cleanupError) {
        // Log warning but don't fail - might be first time processing this repo
        console.warn(`[${new Date().toISOString()}] ⚠️ CLEANUP: Could not clear namespace (might be first processing): ${cleanupError.message}`);
      }

      // Use enhanced upsertDocuments with verbose logging and rate limiting
      console.log(`[${new Date().toISOString()}] ⚡ STORAGE: Starting vector database upsert with timeout protection...`);
      const storageStartTime = Date.now();
      
      // Use AbortController for proper cancellation (though Pinecone SDK may not support it yet)
      let timedOut = false;
      const timeoutId = setTimeout(() => {
        timedOut = true;
        console.error(`[${new Date().toISOString()}] ⏰ Storage operation timed out after 5 minutes`);
      }, 300000);
      
      try {
        const result = await vectorService.upsertDocuments(safeDocuments, this.embeddings, {
          namespace: namespace,
          ids: documentIds,
          githubOwner,
          repoName,
          verbose: true
        });
        
        clearTimeout(timeoutId);
        
        // Check if we timed out during execution
        if (timedOut) {
          console.warn(`[${new Date().toISOString()}] ⚠️ STORAGE: Operation completed but exceeded timeout threshold`);
        }
        
        const storageTime = Date.now() - storageStartTime;
        console.log(`[${new Date().toISOString()}] ✅ STORAGE: Completed in ${storageTime}ms - preserved semantic metadata`);

        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ DATA-PREP: Error storing documents to vector database:`, error);
      console.error(`[${new Date().toISOString()}] 💡 This may be due to database connection issues, API limits, or invalid document format`);
      throw error;
    }
  }

  /**
   * Store repository documents with user-specific namespace and detailed logging
   */
  async storeRepositoryDocuments(splitDocs, userId, repoId, githubOwner, repoName) {
    // Log chunk breakdown for repository documents
    // Removed excessive per-chunk logging for performance - logging summary only
    console.log(`[${new Date().toISOString()}] 📋 [DATA-PREP] Processing ${splitDocs.length} repository chunks for storage`);

    // FIXED: Use repository-based collection name (shared across all users)
    const CollectionNameGenerator = require('../utils/collectionNameGenerator');
    const repoCollection = CollectionNameGenerator.generateForRepository({ repoId, githubOwner, repoName });
    
    console.log(`[${new Date().toISOString()}] 🚀 VECTOR STORAGE: Storing ${splitDocs.length} vector embeddings in repository collection '${repoCollection}'`);

    // Store in vector database with repository-specific collection
    const vectorService = await this._getVectorService();
    if (!vectorService) {
      throw new Error('Vector database service not available');
    }

    try {
      // Import pgvector service class for static methods
      const PGVectorService = require('./pgVectorService');
      
      // Generate deterministic, idempotent document IDs (contentHash + source = unique stable key)
      // Same content + source = same ID → upsert automatically overwrites (no duplicates)
      const documentIds = PGVectorService.generateUserRepositoryDocumentIds(splitDocs, userId, repoId);

      console.log(`[${new Date().toISOString()}] 🔑 IDEMPOTENT IDS: Using deterministic IDs (userId:repoId:source:contentHash)`);
      console.log(`[${new Date().toISOString()}] 📁 COLLECTION: Repository collection name: ${repoCollection} (shared by all users)`);

      // Use enhanced upsertDocuments method with repository collection
      await vectorService.upsertDocuments(splitDocs, this.embeddings, {
        namespace: repoCollection,  // FIXED: Use repository collection instead of userId
        ids: documentIds,
        githubOwner,
        repoName,
        verbose: false // Keep current detailed logging above, no need for duplicate logs
      });

      console.log(`[${new Date().toISOString()}] ✅ DATA-PREP: Successfully indexed ${splitDocs.length} document chunks to repository collection: ${repoCollection}`);

      return {
        success: true,
        chunksStored: splitDocs.length,
        namespace: repoCollection,  // FIXED: Return repository collection name
        documentIds
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ DATA-PREP: Error storing in vector database:`, error.message);
      throw error;
    }
  }
}

module.exports = EmbeddingManager;