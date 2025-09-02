// LegacyCompatibilityLayer.js - Provides backward compatibility
"use strict";

/**
 * LegacyCompatibilityLayer - Provides backward compatibility for legacy methods
 * 
 * This module handles:
 * - Legacy document processing methods
 * - Backward compatibility for existing code
 * - Migration support for deprecated methods
 */
class LegacyCompatibilityLayer {
  constructor(options = {}) {
    this.repositoryManager = options.repositoryManager;
    this.ubiquitousLanguageProcessor = options.ubiquitousLanguageProcessor;
    this.vectorStorageManager = options.vectorStorageManager;
    this.semanticPreprocessor = options.semanticPreprocessor;
    this.repositoryProcessor = options.repositoryProcessor;
    this.pinecone = options.pinecone;
  }

  /**
   * Process core documents through the full pipeline (LEGACY COMPATIBILITY)
   */
  async processDocuments(documents, repoId, githubOwner, repoName) {
    console.log(`[${new Date().toISOString()}] 📚 LEGACY DOCUMENT PROCESSING: Processing ${documents.length} core documents`);
    
    // Apply legacy processing - just pass through documents with basic metadata
    const processedDocs = documents.map(doc => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        repoId,
        githubOwner,
        repoName,
        processed_at: new Date().toISOString()
      }
    }));
    
    // Enhance with ubiquitous language
    const ubiqLanguageEnhancedDocs = [];
    for (const doc of processedDocs) {
      try {
        const ubiqEnhancedDoc = this.ubiquitousLanguageProcessor.enhanceWithUbiquitousLanguage(doc);
        ubiqLanguageEnhancedDocs.push(ubiqEnhancedDoc);
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] ⚠️ DATA-PREP: Failed to enhance ${doc.metadata.source}: ${error.message}`);
        ubiqLanguageEnhancedDocs.push(doc);
      }
    }

    // Apply semantic preprocessing
    const semanticallyEnhancedDocs = [];
    for (const doc of ubiqLanguageEnhancedDocs) {
      try {
        const enhancedDoc = await this.semanticPreprocessor.preprocessChunk(doc);
        semanticallyEnhancedDocs.push(enhancedDoc);
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] ⚠️ DATA-PREP: Failed to semantically enhance ${doc.metadata.source}: ${error.message}`);
        semanticallyEnhancedDocs.push(doc);
      }
    }

    // Apply intelligent splitting using RepositoryProcessor
    const finalChunks = await this.repositoryProcessor.intelligentSplitDocuments(semanticallyEnhancedDocs);

    // Store in Pinecone
    await this.vectorStorageManager.storeToPinecone(finalChunks, 'core-docs', githubOwner, repoName);

    return finalChunks;
  }

  // LEGACY COMPATIBILITY: Expose utility methods for backward compatibility
  
  sanitizeId(input) { 
    return this.repositoryManager.sanitizeId(input); 
  }
  
  getFileType(filePath) { 
    return this.repositoryManager.getFileType(filePath); 
  }
  
  enhanceWithUbiquitousLanguage(document) { 
    return this.ubiquitousLanguageProcessor.enhanceWithUbiquitousLanguage(document); 
  }
  
  async storeToPinecone(documents, namespace, githubOwner, repoName) { 
    return await this.vectorStorageManager.storeToPinecone(documents, namespace, githubOwner, repoName); 
  }
  
  async intelligentSplitDocuments(documents) { 
    // Legacy method - now uses RepositoryProcessor for intelligent splitting
    return await this.repositoryProcessor.intelligentSplitDocuments(documents); 
  }
  
  async cloneRepository(url, branch) { 
    return await this.repositoryManager.cloneRepository(url, branch); 
  }
  
  async cleanupTempDir(tempDir) { 
    return await this.repositoryManager.cleanupTempDir(tempDir); 
  }
  
  async findExistingRepo(userId, repoId, githubOwner, repoName, currentCommitHash = null) { 
    return await this.repositoryManager.findExistingRepo(userId, repoId, githubOwner, repoName, currentCommitHash, this.pinecone); 
  }
  
  async loadAndProcessRepoDocuments(tempDir, userId, repoId, githubOwner, repoName) { 
    // Legacy method - now delegates to RepositoryProcessor
    try {
      const result = await this.repositoryProcessor.loadRepositoryDocuments(`file://${tempDir}`, 'main');
      return { success: true, documents: result.documents || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = LegacyCompatibilityLayer;
