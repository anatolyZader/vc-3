// EmbeddingManager.js
"use strict";

const { PineconeStore } = require('@langchain/pinecone');

/**
 * Handles all embedding and vector storage operations with Pinecone
 */
class EmbeddingManager {
  constructor(options = {}) {
    this.embeddings = options.embeddings;
    this.pineconeLimiter = options.pineconeLimiter;
    this.repositoryManager = options.repositoryManager;
    this.pineconeManager = options.pineconeManager;
    
    // Get the shared Pinecone service from the connection manager
    this.pinecone = this.pineconeManager?.getPineconeService();
  }

  /**
   * Store documents to Pinecone vector database
   */
  async storeToPinecone(documents, namespace, githubOwner, repoName) {
    console.log(`[${new Date().toISOString()}] 🗄️ PINECONE STORAGE EXPLANATION: Converting ${documents?.length || 0} document chunks into searchable vector embeddings`);
    console.log(`[${new Date().toISOString()}] 🎯 Each document chunk will be processed by OpenAI's text-embedding-3-large model to create high-dimensional vectors that capture semantic meaning. These vectors are then stored in Pinecone with unique IDs and metadata for lightning-fast similarity search during RAG queries`);
    
    if (!this.pinecone) {
      console.warn(`[${new Date().toISOString()}] ⚠️ DATA-PREP: Pinecone client not initialized, cannot store documents`);
      console.warn(`[${new Date().toISOString()}] 💡 Vector storage skipped - ensure Pinecone credentials are properly configured`);
      return;
    }

    if (!documents || documents.length === 0) {
      console.log(`[${new Date().toISOString()}] ⚠️ DATA-PREP: No documents to store in Pinecone`);
      console.log(`[${new Date().toISOString()}] 🎯 This usually means no processable files were found in the repository`);
      return;
    }

    console.log(`[${new Date().toISOString()}] 🎯 STORAGE STRATEGY: Using namespace '${namespace}' for data isolation and generating unique IDs for ${documents.length} chunks from ${githubOwner}/${repoName}`);

    try {
      const index = this.pinecone.index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
      const vectorStore = new PineconeStore(this.embeddings, {
        pineconeIndex: index,
        namespace: namespace // Could be userId for user docs or 'core-docs' for system docs
      });

      console.log(`[${new Date().toISOString()}] 🔑 ID GENERATION: Creating unique identifiers to prevent collisions and enable precise retrieval`);

      // Generate unique document IDs
      const documentIds = documents.map((doc, index) => {
        const source = this.repositoryManager.sanitizeId(doc.metadata.source || 'unknown');
        const repoId = this.repositoryManager.sanitizeId(doc.metadata.repoId || 'unknown');
        return `${githubOwner}_${repoId}_${source}_chunk_${index}`;
      });

      console.log(`[${new Date().toISOString()}] ⚡ RATE LIMITING: Using bottleneck limiter to respect Pinecone API limits and prevent throttling`);

      // Use bottleneck limiter for Pinecone operations if available
      if (this.pineconeLimiter) {
        await this.pineconeLimiter.schedule(async () => {
          await vectorStore.addDocuments(documents, { ids: documentIds });
        });
      } else {
        console.log(`[${new Date().toISOString()}] 🚀 EMBEDDING & UPLOAD: Processing ${documents.length} chunks directly (no rate limiter)`);
        await vectorStore.addDocuments(documents, { ids: documentIds });
      }

      console.log(`[${new Date().toISOString()}] ✅ DATA-PREP: Successfully stored ${documents.length} chunks to Pinecone namespace: ${namespace}`);
      console.log(`[${new Date().toISOString()}] 🎯 STORAGE COMPLETE: Vector embeddings are now searchable via semantic similarity queries in the RAG pipeline`);
      console.log(`[${new Date().toISOString()}] 📊 Each chunk includes rich metadata (file types, business modules, architectural layers, AST semantic units) for precise context retrieval`);

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

    // Generate unique IDs for each chunk
    const documentIds = splitDocs.map((doc, index) => {
      const sourceFile = doc.metadata.source || 'unknown';
      const sanitizedSource = this.repositoryManager.sanitizeId(sourceFile.replace(/\//g, '_'));
      return `${userId}_${repoId}_${sanitizedSource}_chunk_${index}`;
    });

    console.log(`[${new Date().toISOString()}] 🚀 PINECONE STORAGE: Storing ${splitDocs.length} vector embeddings with unique IDs in user-specific namespace '${userId}'`);

    // Store in Pinecone with user-specific namespace
    if (this.pinecone) {
      try {
        const index = this.pinecone.index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
        const vectorStore = new PineconeStore(this.embeddings, {
          pineconeIndex: index,
          namespace: userId // User-specific namespace
        });

        // Use bottleneck limiter for Pinecone operations
        if (this.pineconeLimiter) {
          await this.pineconeLimiter.schedule(async () => {
            await vectorStore.addDocuments(splitDocs, { ids: documentIds });
          });
        } else {
          await vectorStore.addDocuments(splitDocs, { ids: documentIds });
        }

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
    } else {
      throw new Error('Pinecone client not available');
    }
  }
}

module.exports = EmbeddingManager;