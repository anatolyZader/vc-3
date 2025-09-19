// ProcessingStrategyManager.js - Manages different processing strategies
"use strict";

/**
 * ProcessingStrategyManager - Handles different processing strategies and workflows
 * 
 * This module handles:
 * - Incremental processing strategies
 * - Full repository processing strategies
 * - Processing optimization decisions
 * - Workflow coordination
 */
class ProcessingStrategyManager {
  constructor(options = {}) {
    this.commitManager = options.commitManager;
    this.documentOrchestrator = options.documentOrchestrator;
    this.repositoryManager = options.repositoryManager;
    this.repositoryProcessor = options.repositoryProcessor;
    this.embeddings = options.embeddings;
    this.pineconeManager = options.pineconeManager;
    
    // Get the shared Pinecone service from the connection manager (only if needed for strategy decisions)
    this.pineconeService = this.pineconeManager?.getPineconeService();
    this.pinecone = this.pineconeService; // For backward compatibility
    
    this.processingStrategy = {
      preferGitHubAPI: true,
      fallbackToLocalGit: true,
      langchainFirst: true
    };
  }

  /**
   * OPTIMIZED: Incremental processing using Langchain-first approach  
   */
  async processIncrementalOptimized(userId, repoId, repoUrl, branch, githubOwner, repoName, oldCommitHash, newCommitInfo) {
    console.log(`[${new Date().toISOString()}] 🔄 OPTIMIZED INCREMENTAL: Processing changes between commits`);
    console.log(`[${new Date().toISOString()}] 📊 From: ${oldCommitHash.substring(0, 8)} → To: ${newCommitInfo.hash.substring(0, 8)}`);
    
    try {
      // Step 1: Get changed files efficiently
      const changedFiles = await this.commitManager.getChangedFilesOptimized(
        repoUrl, branch, githubOwner, repoName, oldCommitHash, newCommitInfo.hash
      );
      
      if (changedFiles.length === 0) {
        console.log(`[${new Date().toISOString()}] 📭 NO CHANGES: No files modified between commits, skipping processing`);
        return { 
          success: true, 
          message: 'No files changed between commits', 
          repoId, userId,
          changedFiles: [],
          skipped: true
        };
      }

      console.log(`[${new Date().toISOString()}] 📋 CHANGED FILES (${changedFiles.length}): ${changedFiles.join(', ')}`);

      // Step 2: Load documents using Langchain (no manual filesystem operations!)
      const allDocuments = await this.documentOrchestrator.loadDocumentsWithLangchain(repoUrl, branch, githubOwner, repoName, newCommitInfo);
      
      // Step 3: Filter to only changed files
      const changedDocuments = allDocuments.filter(doc => 
        changedFiles.some(file => doc.metadata.source?.includes(file))
      );

      console.log(`[${new Date().toISOString()}] 🔄 INCREMENTAL DOCUMENTS: Filtered to ${changedDocuments.length} documents from ${allDocuments.length} total`);

      if (changedDocuments.length === 0) {
        console.log(`[${new Date().toISOString()}] ⚠️ No documents found for changed files, processing all files as fallback`);
        return await this.processFullRepositoryOptimized(userId, repoId, repoUrl, branch, githubOwner, repoName, newCommitInfo);
      }

      // Step 4: Process changed documents
      const namespace = this.repositoryManager.sanitizeId(`${githubOwner}_${repoName}_${branch}`);
      const result = await this.documentOrchestrator.processFilteredDocuments(changedDocuments, namespace, newCommitInfo, true);
      
      // Step 5: Update repository tracking
      await this.repositoryManager.storeRepositoryTrackingInfo(
        userId, repoId, githubOwner, repoName, newCommitInfo, 
        namespace, this.pinecone, this.embeddings
      );

      return {
        success: true,
        message: `Optimized incremental processing completed for ${changedFiles.length} changed files`,
        incrementalProcessing: true,
        changedFiles,
        documentsProcessed: result.documentsProcessed || 0,
        chunksGenerated: result.chunksGenerated || 0,
        oldCommitHash, 
        newCommitHash: newCommitInfo.hash,
        userId, repoId, githubOwner, repoName,
        namespace,
        processedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error in optimized incremental processing:`, error.message);
      throw error;
    }
  }

  /**
   * OPTIMIZED: Full repository processing using Langchain-first approach
   */
  async processFullRepositoryOptimized(userId, repoId, repoUrl, branch, githubOwner, repoName, commitInfo) {
    console.log(`[${new Date().toISOString()}] 🔵 OPTIMIZED FULL PROCESSING: Using Langchain-first approach for complete repository`);
    
    try {
      // Step 1: Load ALL documents using Langchain (no manual filesystem operations)
      const documents = await this.documentOrchestrator.loadDocumentsWithLangchain(repoUrl, branch, githubOwner, repoName, commitInfo);
      
      // Step 2: Process all documents
      const namespace = this.repositoryManager.sanitizeId(`${githubOwner}_${repoName}_${branch}`);
      const result = await this.documentOrchestrator.processFilteredDocuments(documents, namespace, commitInfo, false);
      
      // Step 3: Store repository tracking info for future duplicate detection
      await this.repositoryManager.storeRepositoryTrackingInfo(
        userId, repoId, githubOwner, repoName, commitInfo, 
        namespace, this.pinecone, this.embeddings
      );

      return {
        success: true,
        message: 'Optimized repository processing completed with Langchain-first approach',
        totalDocuments: result.documentsProcessed || 0,
        totalChunks: result.chunksGenerated || 0,
        commitHash: commitInfo.hash,
        commitInfo,
        userId, repoId, githubOwner, repoName,
        namespace,
        processedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error in optimized full processing:`, error.message);
      throw error;
    }
  }

  /**
   * Process incremental changes between commits (legacy method with updated signature)
   */
  async processIncrementalChanges(userId, repoId, repoData, tempDir, repoInfo, commitHashes, commitInfo) {
    const { githubOwner, repoName, branch } = repoInfo;
    const { oldCommitHash, newCommitHash } = commitHashes;
    
    console.log(`[${new Date().toISOString()}] 🔄 INCREMENTAL PROCESSING: Analyzing changes between commits`);
    console.log(`[${new Date().toISOString()}] 📊 From: ${oldCommitHash.substring(0, 8)} → To: ${newCommitHash.substring(0, 8)}`);
    
    try {
      // Get list of changed files
      const changedFiles = await this.commitManager.getChangedFilesFromLocalGit(tempDir, oldCommitHash, newCommitHash);
      
      if (changedFiles.length === 0) {
        console.log(`[${new Date().toISOString()}] 📭 NO CHANGES: No files modified between commits, skipping processing`);
        await this.repositoryManager.cleanupTempDir(tempDir);
        return { 
          success: true, 
          message: 'No files changed between commits', 
          repoId, userId,
          changedFiles: [],
          skipped: true
        };
      }

      console.log(`[${new Date().toISOString()}] 📋 CHANGED FILES (${changedFiles.length}):`);
      changedFiles.forEach(file => {
        console.log(`[${new Date().toISOString()}]   🔄 ${file}`);
      });

      // Create namespace for this repository
      const namespace = this.repositoryManager.sanitizeId(`${githubOwner}_${repoName}_${branch}`);
      
      // Remove vectors for changed files from Pinecone
      await this.removeChangedFilesFromPinecone(changedFiles, namespace, githubOwner, repoName);
      
      // Process only the changed files using repository processor
      const incrementalResult = await this.repositoryProcessor.processChangedFiles(
        tempDir, changedFiles, namespace, githubOwner, repoName
      );
      
      // Update repository tracking info
      await this.repositoryManager.storeRepositoryTrackingInfo(
        userId, repoId, githubOwner, repoName, commitInfo, 
        namespace, this.pinecone, this.embeddings
      );
      
      // Cleanup temp directory
      await this.repositoryManager.cleanupTempDir(tempDir);

      return {
        success: true,
        message: `Incremental processing completed for ${changedFiles.length} changed files`,
        incrementalProcessing: true,
        changedFiles,
        documentsProcessed: incrementalResult.documentsProcessed || 0,
        chunksGenerated: incrementalResult.chunksGenerated || 0,
        oldCommitHash, newCommitHash,
        userId, repoId, githubOwner, repoName,
        namespace,
        processedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error in incremental processing:`, error.message);
      
      // Cleanup temp directory on error
      try {
        await this.repositoryManager.cleanupTempDir(tempDir);
      } catch (cleanupError) {
        console.warn(`[${new Date().toISOString()}] ⚠️ Failed to cleanup temp directory:`, cleanupError.message);
      }
      
      throw error;
    }
  }

  /**
   * Remove vectors for changed files from Pinecone
   */
  async removeChangedFilesFromPinecone(changedFiles, namespace, githubOwner, repoName) {
    if (!this.pinecone) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Cannot remove changed files: Pinecone client not available`);
      return;
    }

    try {
      const index = this.pinecone.Index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
      
      // Create vector IDs for changed files (matching the pattern used in VectorStorageService)
      const vectorIdsToDelete = [];
      
      changedFiles.forEach(filePath => {
        const sanitizedFile = this.repositoryManager.sanitizeId(filePath);
        // Generate pattern to match all chunks from this file
        // Note: This is a simplified approach - in practice, you might need to query first to find exact IDs
        const filePattern = `${githubOwner}_*_${sanitizedFile}_chunk_*`;
        vectorIdsToDelete.push(filePattern);
      });

      console.log(`[${new Date().toISOString()}] 🗑️ CLEANUP: Removing vectors for ${changedFiles.length} changed files from namespace ${namespace}`);
      
      // Note: Pinecone doesn't support wildcard deletion directly
      // We'll need to query first to find matching vectors, then delete them
      // For now, we'll log this limitation
      console.log(`[${new Date().toISOString()}] 📝 TODO: Implement precise vector deletion for changed files`);
      console.log(`[${new Date().toISOString()}] 💡 Current approach will overwrite existing vectors when new ones are added`);
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error removing changed files from Pinecone:`, error.message);
    }
  }
}

module.exports = ProcessingStrategyManager;
