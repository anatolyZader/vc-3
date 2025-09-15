/**
 * ModernVectorStorageManager - Clean vector storage implementation
 * 
 * Replaces the old vectorStorageManager with a modern implementation
 * that uses the centralized PineconeService for all vector operations.
 */

const PineconeService = require('../pinecone/PineconeService');

class ModernVectorStorageManager {
  constructor(options = {}) {
    this.embeddings = options.embeddings;
    this.rateLimiter = options.rateLimiter || options.pineconeLimiter;
    this.repositoryManager = options.repositoryManager;
    
    // Initialize PineconeService
    this.pineconeService = new PineconeService({
      rateLimiter: this.rateLimiter,
      apiKey: options.apiKey,
      indexName: options.indexName,
      region: options.region
    });

    this.logger = {
      info: (msg, ...args) => console.log(`[${new Date().toISOString()}] [VectorStorage] ${msg}`, ...args),
      warn: (msg, ...args) => console.warn(`[${new Date().toISOString()}] [VectorStorage] ${msg}`, ...args),
      error: (msg, ...args) => console.error(`[${new Date().toISOString()}] [VectorStorage] ${msg}`, ...args),
      debug: (msg, ...args) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[${new Date().toISOString()}] [VectorStorage:DEBUG] ${msg}`, ...args);
        }
      }
    };
  }

  /**
   * Store documents to Pinecone vector database
   */
  async storeToPinecone(documents, namespace, githubOwner, repoName) {
    this.logger.info(`🗄️ PINECONE STORAGE: Converting ${documents?.length || 0} document chunks into searchable vector embeddings`);
    this.logger.debug('Each document chunk will be processed by OpenAI\'s text-embedding-3-large model to create high-dimensional vectors');

    if (!documents || documents.length === 0) {
      this.logger.warn('No documents to store in Pinecone');
      return { success: true, processed: 0 };
    }

    if (!this.embeddings) {
      throw new Error('Embeddings model not provided');
    }

    this.logger.info(`🎯 STORAGE STRATEGY: Using namespace '${namespace}' for data isolation and generating unique IDs for ${documents.length} chunks from ${githubOwner}/${repoName}`);

    try {
      // Generate unique document IDs
      const documentIds = this.generateDocumentIds(documents, githubOwner, repoName);

      this.logger.info('🔑 ID GENERATION: Creating unique identifiers to prevent collisions and enable precise retrieval');

      // Store documents using PineconeService
      const result = await this.pineconeService.upsertDocuments(documents, this.embeddings, {
        namespace,
        ids: documentIds,
        batchSize: 100,
        onProgress: (processed, total) => {
          this.logger.debug(`Progress: ${processed}/${total} documents processed`);
        }
      });

      this.logger.info(`✅ STORAGE COMPLETE: Successfully stored ${result.processed} chunks to Pinecone namespace: ${namespace}`);
      this.logger.debug('Vector embeddings are now searchable via semantic similarity queries in the RAG pipeline');

      return {
        success: true,
        chunksStored: result.processed,
        namespace,
        documentIds
      };

    } catch (error) {
      this.logger.error('Error storing documents to Pinecone:', error.message);
      throw error;
    }
  }

  /**
   * Store repository documents with user-specific namespace
   */
  async storeRepositoryDocuments(splitDocs, userId, repoId, githubOwner, repoName) {
    // Log detailed chunk breakdown
    this.logger.info('📋 SEMANTICALLY ENHANCED + AST-SPLIT REPOSITORY CHUNK BREAKDOWN:');
    
    splitDocs.forEach((doc, index) => {
      const preview = doc.pageContent.substring(0, 100).replace(/\n/g, ' ').trim();
      const semanticInfo = doc.metadata.enhanced ? 
        `${doc.metadata.semantic_role}|${doc.metadata.layer}|${doc.metadata.eventstorm_module}` : 
        'not-enhanced';
      const astInfo = doc.metadata.chunk_type || 'regular';
      const astDetails = doc.metadata.semantic_unit ? 
        `${doc.metadata.semantic_unit}(${doc.metadata.function_name})` : 
        'n/a';
      
      this.logger.debug(`📄 [REPO-CHUNK ${index + 1}/${splitDocs.length}] ${doc.metadata.source} (${doc.pageContent.length} chars)`);
      this.logger.debug(`📝 Preview: ${preview}${doc.pageContent.length > 100 ? '...' : ''}`);
      this.logger.debug(`🏷️ FileType: ${doc.metadata.fileType}, Repo: ${doc.metadata.repoName}`);
      this.logger.debug(`🧠 Semantic: ${semanticInfo}, EntryPoint: ${doc.metadata.is_entrypoint || false}, Complexity: ${doc.metadata.complexity || 'unknown'}`);
      this.logger.debug(`🌳 AST: ${astInfo}, Unit: ${astDetails}, Lines: ${doc.metadata.start_line || '?'}-${doc.metadata.end_line || '?'}`);
    });

    // Generate repository-specific document IDs
    const documentIds = this.generateRepositoryDocumentIds(splitDocs, userId, repoId);

    this.logger.info(`🚀 PINECONE STORAGE: Storing ${splitDocs.length} vector embeddings with unique IDs in user-specific namespace '${userId}'`);

    try {
      const result = await this.pineconeService.upsertDocuments(splitDocs, this.embeddings, {
        namespace: userId,
        ids: documentIds,
        batchSize: 50, // Smaller batches for repository documents
        onProgress: (processed, total) => {
          this.logger.info(`Repository processing: ${processed}/${total} documents indexed`);
        }
      });

      this.logger.info(`✅ Successfully indexed ${result.processed} document chunks to Pinecone`);

      return {
        success: true,
        chunksStored: result.processed,
        namespace: userId,
        documentIds
      };

    } catch (error) {
      this.logger.error('Error storing repository documents:', error.message);
      throw error;
    }
  }

  /**
   * Generate unique document IDs for general documents
   */
  generateDocumentIds(documents, githubOwner, repoName) {
    return documents.map((doc, index) => {
      const source = this.repositoryManager ? 
        this.repositoryManager.sanitizeId(doc.metadata.source || 'unknown') :
        this.sanitizeId(doc.metadata.source || 'unknown');
      const repoId = this.repositoryManager ? 
        this.repositoryManager.sanitizeId(doc.metadata.repoId || 'unknown') :
        this.sanitizeId(repoName || 'unknown');
      
      return PineconeService.generateDocumentId('doc', [githubOwner, repoId, source, 'chunk', index]);
    });
  }

  /**
   * Generate repository-specific document IDs
   */
  generateRepositoryDocumentIds(splitDocs, userId, repoId) {
    return splitDocs.map((doc, index) => {
      const sourceFile = doc.metadata.source || 'unknown';
      const sanitizedSource = this.sanitizeId(sourceFile.replace(/\//g, '_'));
      
      return PineconeService.generateDocumentId('repo', [userId, repoId, sanitizedSource, 'chunk', index]);
    });
  }

  /**
   * Sanitize ID component
   */
  sanitizeId(str) {
    return String(str).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  }

  /**
   * Delete documents from a namespace
   */
  async deleteNamespaceDocuments(namespace) {
    try {
      this.logger.info(`Deleting all documents in namespace: ${namespace}`);
      
      const result = await this.pineconeService.deleteNamespace(namespace);
      
      this.logger.info(`Successfully deleted namespace: ${namespace}`);
      return result;

    } catch (error) {
      this.logger.error(`Error deleting namespace ${namespace}:`, error.message);
      throw error;
    }
  }

  /**
   * Get namespace statistics
   */
  async getNamespaceInfo(namespace) {
    try {
      const stats = await this.pineconeService.getNamespaceStats(namespace);
      return stats;
    } catch (error) {
      this.logger.error(`Error getting namespace info for ${namespace}:`, error.message);
      throw error;
    }
  }

  /**
   * List all namespaces
   */
  async listNamespaces() {
    try {
      return await this.pineconeService.listNamespaces();
    } catch (error) {
      this.logger.error('Error listing namespaces:', error.message);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  isConnected() {
    return this.pineconeService.isConnectedToIndex();
  }

  /**
   * Create PineconeStore for LangChain integration
   */
  async createVectorStore(namespace = null) {
    if (!this.embeddings) {
      throw new Error('Embeddings model not provided');
    }

    return await this.pineconeService.createVectorStore(this.embeddings, namespace);
  }

  /**
   * Disconnect from Pinecone
   */
  async disconnect() {
    await this.pineconeService.disconnect();
    this.logger.info('Vector storage manager disconnected');
  }
}

module.exports = ModernVectorStorageManager;