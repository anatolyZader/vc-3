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
    this.pineconeManager = options.pineconeManager;
    
    // Store promise; don't treat pending Promise as client
    this._pineconeService = null;
    this._pineconeServicePromise = this.pineconeManager?.getPineconeService?.();
    this.pinecone = null; // backward compatibility alias after resolution
  }

  async _getPineconeService() {
    if (this._pineconeService) return this._pineconeService;
    if (this._pineconeServicePromise) {
      try {
        this._pineconeService = await this._pineconeServicePromise;
      } catch (err) {
        console.warn(`[${new Date().toISOString()}] ⚠️ EmbeddingManager: Pinecone initialization failed: ${err.message}`);
        this._pineconeService = null;
      } finally {
        this._pineconeServicePromise = null;
      }
      this.pinecone = this._pineconeService;
    }
    return this._pineconeService;
  }

  /**
   * Store documents to Pinecone vector database
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
      // Import TokenBasedSplitter for safety validation
      const TokenBasedSplitter = require('./processors/tokenBasedSplitter');
      const tokenSplitter = new TokenBasedSplitter({
        maxTokens: 1400, // Safe limit well under 8192
        minTokens: 100,
        overlapTokens: 150
      });

      // Validate and re-chunk documents that exceed token limits
      const safeDocuments = [];
      let rechunkedCount = 0;

      for (const doc of documents) {
        const tokenCheck = tokenSplitter.exceedsTokenLimit(doc.pageContent);
        
        if (tokenCheck.exceeds) {
          console.log(`[${new Date().toISOString()}] ⚠️ TOKEN SAFETY: Document exceeds ${tokenSplitter.maxTokens} tokens (${tokenCheck.tokenCount}), re-chunking...`);
          
          // Re-chunk the oversized document
          const chunks = tokenSplitter.splitText(doc.pageContent);
          for (const chunk of chunks) {
            safeDocuments.push(new Document({
              pageContent: chunk.content,
              metadata: {
                ...doc.metadata,
                rechunked: true,
                originalTokens: tokenCheck.tokenCount,
                chunkTokens: chunk.tokens,
                chunkIndex: chunk.index
              }
            }));
          }
          rechunkedCount++;
        } else {
          safeDocuments.push(doc);
        }
      }

      if (rechunkedCount > 0) {
        console.log(`[${new Date().toISOString()}] 🔧 TOKEN SAFETY: Re-chunked ${rechunkedCount} oversized documents into ${safeDocuments.length - documents.length + rechunkedCount} safe chunks`);
      }
      // Import PineconeService class for static methods
      const PineconeService = require('../../pinecone/PineconeService');
      
      // Generate unique document IDs using centralized method (use safeDocuments)
      const documentIds = PineconeService.generateRepositoryDocumentIds(safeDocuments, namespace, {
        useTimestamp: true,
        prefix: null
      });

      console.log(`[${new Date().toISOString()}] 🔒 TOKEN-VALIDATED STORAGE: Processing ${safeDocuments.length} token-safe documents`);

      // Use enhanced upsertDocuments with verbose logging and rate limiting
      const result = await pineconeService.upsertDocuments(safeDocuments, this.embeddings, {
        namespace: namespace,
        ids: documentIds,
        githubOwner,
        repoName,
        verbose: true,
        rateLimiter: this.pineconeLimiter
      });

      return result;

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
    console.log(`[${new Date().toISOString()}] 📋 [DATA-PREP] SEMANTICALLY ENHANCED + AST-SPLIT REPOSITORY CHUNK BREAKDOWN:`);
    splitDocs.forEach((doc, index) => {
      const preview = doc.pageContent.substring(0, 100).replace(/\n/g, ' ').trim();
      const semanticInfo = doc.metadata.enhanced ? 
        `${doc.metadata.semantic_role}|${doc.metadata.layer}|${doc.metadata.eventstorm_module}` : 
        'not-enhanced';
      const astInfo = doc.metadata.chunk_type || 'regular';
      const astDetails = doc.metadata.semantic_unit ? 
        `${doc.metadata.semantic_unit}(${doc.metadata.function_name})` : 
        'n/a';
      
      console.log(`[${new Date().toISOString()}] 📄 [REPO-CHUNK ${index + 1}/${splitDocs.length}] ${doc.metadata.source} (${doc.pageContent.length} chars)`);
      console.log(`[${new Date().toISOString()}] 📝 Preview: ${preview}${doc.pageContent.length > 100 ? '...' : ''}`);
      console.log(`[${new Date().toISOString()}] 🏷️  FileType: ${doc.metadata.fileType}, Repo: ${doc.metadata.repoName}`);
      console.log(`[${new Date().toISOString()}] 🧠 Semantic: ${semanticInfo}, EntryPoint: ${doc.metadata.is_entrypoint || false}, Complexity: ${doc.metadata.complexity || 'unknown'}`);
      console.log(`[${new Date().toISOString()}] 🌳 AST: ${astInfo}, Unit: ${astDetails}, Lines: ${doc.metadata.start_line || '?'}-${doc.metadata.end_line || '?'}`);
      console.log(`[${new Date().toISOString()}] ${'─'.repeat(80)}`);
    });

    console.log(`[${new Date().toISOString()}] 🚀 PINECONE STORAGE: Storing ${splitDocs.length} vector embeddings with unique IDs in user-specific namespace '${userId}'`);

    // Store in Pinecone with user-specific namespace
    const pineconeService = await this._getPineconeService();
    if (!pineconeService) {
      throw new Error('Pinecone client not available');
    }

    try {
      // Import PineconeService class for static methods
      const PineconeService = require('../../pinecone/PineconeService');
      
      // Generate unique document IDs using centralized method
      const documentIds = PineconeService.generateUserRepositoryDocumentIds(splitDocs, userId, repoId);

      // Use enhanced upsertDocuments method
      const result = await pineconeService.upsertDocuments(splitDocs, this.embeddings, {
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