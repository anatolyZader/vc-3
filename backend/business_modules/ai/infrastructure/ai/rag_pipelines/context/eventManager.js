// EventManager.js - Handles event emission and status management
"use strict";

/**
 * EventManager - Manages event emission and status reporting
 * 
 * This module handles:
 * - RAG processing status events
 * - Event emission coordination  
 * - Status update management
 */
class EventManager {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
  }

  /**
   * Emit RAG processing status events
   */
  emitRagStatus(status, details = {}) {
    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      try {
        this.eventBus.emit('rag_status_update', {
          status,
          timestamp: new Date().toISOString(),
          ...details
        });
        console.log(`[${new Date().toISOString()}] 📡 EVENT: Emitted RAG status: ${status}`);
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] ⚠️ DATA-PREP: Failed to emit RAG status:`, error.message);
      }
    }
  }

  /**
   * Emit processing started event
   */
  emitProcessingStarted(userId, repoId) {
    this.emitRagStatus('processing_started', {
      userId,
      repoId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit processing completed event
   */
  emitProcessingCompleted(userId, repoId, processingResults) {
    this.emitRagStatus('processing_completed', {
      userId, 
      repoId, 
      totalDocuments: processingResults.totalDocuments || 0,
      totalChunks: processingResults.totalChunks || 0,
      processingResults: processingResults.processingResults,
      commitHash: processingResults.commitHash,
      commitInfo: processingResults.commitInfo,
      githubOwner: processingResults.githubOwner, 
      repoName: processingResults.repoName, 
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit incremental processing completed event
   */
  emitIncrementalProcessingCompleted(userId, repoId, result) {
    this.emitRagStatus('incremental_processing_completed', {
      userId, 
      repoId, 
      changedFiles: result.changedFiles?.length || 0,
      documentsProcessed: result.documentsProcessed || 0,
      chunksGenerated: result.chunksGenerated || 0,
      oldCommitHash: result.oldCommitHash, 
      newCommitHash: result.newCommitHash,
      githubOwner: result.githubOwner, 
      repoName: result.repoName, 
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit processing skipped event
   */
  emitProcessingSkipped(userId, repoId, reason, commitHash) {
    this.emitRagStatus('processing_skipped', {
      userId, 
      repoId, 
      reason, 
      currentCommit: commitHash,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit processing error event
   */
  emitProcessingError(userId, repoId, error, phase) {
    this.emitRagStatus('processing_error', {
      userId, 
      repoId, 
      error: error.message, 
      phase, 
      processedAt: new Date().toISOString()
    });
  }
}

module.exports = EventManager;
