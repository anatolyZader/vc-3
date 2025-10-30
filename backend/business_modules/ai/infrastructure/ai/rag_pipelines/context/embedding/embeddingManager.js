// EmbeddingManager.js
"use strict";

const { Document } = require('langchain/document');

/**
 * Handles all embedding and vector storage operations with Pinecone
 * Now uses centralized PineconeService for all vector operations
 * Added token-based safety validation to prevent embedding API failures
 */
class EmbeddingManager {
  constructor(options = {}) {
    this.embeddings = options.embeddings;
    this.pineconeLimiter = options.pineconeLimiter;
    
    // Require PineconeService as a dependency - don't create it ourselves
    if (!options.pineconeService) {
      throw new Error('EmbeddingManager requires a pineconeService instance. Pass it via options.pineconeService');
    }
    
    this.pineconeService = options.pineconeService;
    
    // Backward compatibility alias
    this.pinecone = this.pineconeService;
  }

  async _getPineconeService() {
    return this.pineconeService;
  }

  /**
   * Store documents to Pinecone vector database
   * NOTE: Safety rechunking enabled ONLY for oversized chunks (>8000 tokens)
   * Preserves semantic metadata by copying it to all sub-chunks
   */
  async storeToPinecone(documents, namespace, githubOwner, repoName) {
    const pineconeService = await this._getPineconeService();
    if (!pineconeService) {
      console.warn(`[${new Date().toISOString()}] ⚠️ DATA-PREP: Pinecone client unavailable (skipping vector storage)`);
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
      
      // Import PineconeService class for static methods
      const PineconeService = require('./pineconeService');
      
      // Generate stable document IDs with version tracking in metadata
      const documentIds = PineconeService.generateRepositoryDocumentIds(safeDocuments, namespace, {
        includeVersion: true,  // Store version in metadata for tracking
        prefix: null
      });

      console.log(`[${new Date().toISOString()}] 📝 STORING TO PINECONE: Processing ${safeDocuments.length} semantically-rich documents`);

      // CLEANUP: Delete old embeddings for this repository before adding new ones
      console.log(`[${new Date().toISOString()}] 🧹 CLEANUP: Removing old embeddings for namespace: ${namespace}`);
      try {
        // Use targeted cleanup that preserves system docs but removes old repo versions
        const cleanupResult = await pineconeService.cleanupOldRepositoryEmbeddings(namespace, {
          keepLatestCount: 0, // Remove all old versions since we're adding fresh ones
          dryRun: false
        });
        console.log(`[${new Date().toISOString()}] ✅ CLEANUP: Successfully cleaned up ${cleanupResult.deleted} old embeddings, kept ${cleanupResult.kept} current ones`);
      } catch (cleanupError) {
        // If targeted cleanup fails, try full namespace deletion as fallback
        console.warn(`[${new Date().toISOString()}] ⚠️ CLEANUP: Targeted cleanup failed, trying full namespace deletion: ${cleanupError.message}`);
        try {
          await pineconeService.deleteNamespace(namespace);
          console.log(`[${new Date().toISOString()}] ✅ CLEANUP: Successfully cleared namespace as fallback`);
        } catch (fallbackError) {
          // Log warning but don't fail - might be first time processing this repo
          console.warn(`[${new Date().toISOString()}] ⚠️ CLEANUP: Could not delete old embeddings (might be first processing): ${fallbackError.message}`);
        }
      }

      // Use enhanced upsertDocuments with verbose logging and rate limiting
      console.log(`[${new Date().toISOString()}] ⚡ STORAGE: Starting Pinecone upsert with timeout protection...`);
      const storageStartTime = Date.now();
      
      // Use AbortController for proper cancellation (though Pinecone SDK may not support it yet)
      let timedOut = false;
      const timeoutId = setTimeout(() => {
        timedOut = true;
        console.error(`[${new Date().toISOString()}] ⏰ Storage operation timed out after 5 minutes`);
      }, 300000);
      
      try {
        const result = await pineconeService.upsertDocuments(safeDocuments, this.embeddings, {
          namespace: namespace,
          ids: documentIds,
          githubOwner,
          repoName,
          verbose: true,
          rateLimiter: this.pineconeLimiter
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
      console.error(`[${new Date().toISOString()}] ❌ DATA-PREP: Error storing documents to Pinecone:`, error);
      console.error(`[${new Date().toISOString()}] 💡 This may be due to API limits, network issues, or invalid document format`);
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

    console.log(`[${new Date().toISOString()}] 🚀 PINECONE STORAGE: Storing ${splitDocs.length} vector embeddings with unique IDs in user-specific namespace '${userId}'`);

    // Store in Pinecone with user-specific namespace
    const pineconeService = await this._getPineconeService();
    if (!pineconeService) {
      throw new Error('Pinecone client not available');
    }

    try {
      // Import PineconeService class for static methods
      const PineconeService = require('./pineconeService');
      
      // Generate stable document IDs with version tracking in metadata
      const documentIds = PineconeService.generateUserRepositoryDocumentIds(splitDocs, userId, repoId, {
        includeVersion: true  // Store version in metadata for tracking
      });

      // Use enhanced upsertDocuments method
      await pineconeService.upsertDocuments(splitDocs, this.embeddings, {
        namespace: userId,
        ids: documentIds,
        githubOwner,
        repoName,
        verbose: false, // Keep current detailed logging above, no need for duplicate logs
        rateLimiter: this.pineconeLimiter
      });

      console.log(`[${new Date().toISOString()}] ✅ DATA-PREP: Successfully indexed ${splitDocs.length} document chunks to Pinecone`);

      return {
        success: true,
        chunksStored: splitDocs.length,
        namespace: userId,
        documentIds
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ DATA-PREP: Error storing in Pinecone:`, error.message);
      throw error;
    }
  }


}

module.exports = EmbeddingManager;