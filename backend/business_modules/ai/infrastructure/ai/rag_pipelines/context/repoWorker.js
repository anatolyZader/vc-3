// repoWorker.js - Individual worker for processing repository work units
'use strict';

const { parentPort, workerData } = require('worker_threads');
const path = require('path');

/**
 * Repository Processing Worker
 * 
 * Handles individual work units in a separate thread
 * Features:
 * - Rate limit aware processing
 * - Progress reporting
 * - Error handling and recovery
 * - Graceful shutdown
 */
class RepoWorker {
  constructor(workerId, globalRateLimit) {
    this.workerId = workerId;
    this.globalRateLimit = globalRateLimit;
    this.isProcessing = false;
    this.currentWorkUnit = null;
    this.processedFiles = 0;
    this.startTime = Date.now();
    
    // Import required modules
    this.initializeModules();

    // Signal ready to main thread
    this.sendMessage({
      type: 'WORKER_READY',
      workerId: this.workerId,
      timestamp: Date.now()
    });
  }

  /**
   * Initialize required modules for processing
   */
  async initializeModules() {
    try {
      // Import CloudNativeRepoLoader for file processing
      const CloudNativeRepoLoader = require('./cloudNativeRepoLoader');
      this.repoLoader = new CloudNativeRepoLoader({
        workerId: this.workerId,
        enableBatching: true,
        batchSize: 3, // Process 3 files at a time
        delayBetweenBatches: 1000 // 1 second between batches
      });
      
      // Document processing will be handled by main pipeline
      // this.documentProcessor = require('../DocumentProcessor');

      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ WORKER ${this.workerId}: Failed to initialize modules:`, error);
      this.sendMessage({
        type: 'WORKER_ERROR',
        workerId: this.workerId,
        error: error.message
      });
    }
  }

  /**
   * Process a work unit
   */
  async processWorkUnit(jobId, workUnit) {
    this.isProcessing = true;
    this.currentWorkUnit = workUnit;
    const startTime = Date.now();
    
    
    try {
      // Configure repo loader with repository information
      if (workUnit.repositoryJob && this.repoLoader) {
        const { githubOwner, repoName, branch } = workUnit.repositoryJob;
        this.repoLoader.owner = githubOwner;
        this.repoLoader.repo = repoName;
        this.repoLoader.branch = branch;
        console.log(`[${new Date().toISOString()}] 🔧 WORKER ${this.workerId}: Configured for ${githubOwner}/${repoName}:${branch}`);
      }
      
      // Check rate limits before processing
      await this.checkRateLimits();
      
      const result = {
        workUnitId: workUnit.id,
        workerId: this.workerId,
        documentsProcessed: 0,
        chunksGenerated: 0,
        filesProcessed: [],
        errors: [],
        startTime,
        success: true
      };
      
      // Process files in batches
      const batches = this.createFileBatches(workUnit.files);
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        this.sendMessage({
          type: 'PROGRESS_UPDATE',
          workerId: this.workerId,
          workUnitId: workUnit.id,
          progress: {
            batchIndex: batchIndex + 1,
            totalBatches: batches.length,
            filesInBatch: batch.length,
            processedFiles: this.processedFiles
          }
        });
        
        // Process batch
        const batchResult = await this.processBatch(batch, workUnit.repositoryJob);
        
        // Aggregate results
        result.documentsProcessed += batchResult.documentsProcessed;
        result.chunksGenerated += batchResult.chunksGenerated;
        result.filesProcessed.push(...batchResult.filesProcessed);
        result.errors.push(...batchResult.errors);
        
        // Rate limiting delay between batches
        if (batchIndex < batches.length - 1) {
          await this.delay(1500); // 1.5 second delay between batches
        }
      }
      
      result.endTime = Date.now();
      result.processingTime = result.endTime - result.startTime;
      
      console.log(`[${new Date().toISOString()}] ✅ WORKER ${this.workerId}: Completed work unit ${workUnit.id}`);
      console.log(`[${new Date().toISOString()}] 📊 WORKER ${this.workerId}: ${result.documentsProcessed} docs, ${result.chunksGenerated} chunks`);
      
      this.sendMessage({
        type: 'WORK_UNIT_COMPLETED',
        jobId,
        workUnitId: workUnit.id,
        result
      });
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ WORKER ${this.workerId}: Work unit ${workUnit.id} failed:`, error.message);
      
      this.sendMessage({
        type: 'WORK_UNIT_FAILED',
        jobId,
        workUnitId: workUnit.id,
        error: error.message,
        stack: error.stack
      });
    } finally {
      this.isProcessing = false;
      this.currentWorkUnit = null;
    }
  }

  /**
   * Create file batches for processing
   */
  createFileBatches(files, batchSize = 3) {
    const batches = [];
    
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * Process a batch of files
   */
  async processBatch(fileBatch, repositoryJob) {
    const { repoUrl, branch, githubOwner, repoName, userId, repoId } = repositoryJob;
    
    const batchResult = {
      documentsProcessed: 0,
      chunksGenerated: 0,
      filesProcessed: [],
      errors: []
    };
    
    try {
      // Process each file in the batch
      for (const file of fileBatch) {
        try {
          console.log(`[${new Date().toISOString()}] 📄 WORKER ${this.workerId}: Processing ${file.path}`);
          
          // Load file content using the correct method
          const fileContent = await this.repoLoader.loadSingleFile({
            path: file.path
          });
          
          if (fileContent && fileContent.pageContent) {
            // Process document with enhanced metadata
            const document = {
              pageContent: fileContent.pageContent,
              metadata: {
                ...fileContent.metadata,
                source: `${githubOwner}/${repoName}`,
                filePath: file.path,
                repoId,
                userId,
                branch,
                fileSize: file.size,
                workerId: this.workerId,
                processedAt: new Date().toISOString(),
                priority: this.getFilePriority(file.path)
              }
            };
            
            // Generate chunks and store in Pinecone
            const chunks = await this.processDocument(document);
            
            batchResult.documentsProcessed++;
            batchResult.chunksGenerated += chunks.length;
            batchResult.filesProcessed.push({
              path: file.path,
              size: file.size,
              chunks: chunks.length,
              success: true
            });
            
            this.processedFiles++;
            
          } else {
            console.warn(`[${new Date().toISOString()}] ⚠️  WORKER ${this.workerId}: Empty content for ${file.path}`);
            batchResult.errors.push(`Empty content: ${file.path}`);
          }
          
        } catch (fileError) {
          console.error(`[${new Date().toISOString()}] ❌ WORKER ${this.workerId}: File ${file.path} failed:`, fileError.message);
          batchResult.errors.push(`${file.path}: ${fileError.message}`);
          
          batchResult.filesProcessed.push({
            path: file.path,
            size: file.size,
            chunks: 0,
            success: false,
            error: fileError.message
          });
        }
        
        // Brief delay between files to avoid overwhelming GitHub API
        await this.delay(500); // 0.5 second between files
      }
      
    } catch (batchError) {
      console.error(`[${new Date().toISOString()}] ❌ WORKER ${this.workerId}: Batch processing failed:`, batchError.message);
      batchResult.errors.push(`Batch error: ${batchError.message}`);
    }
    
    return batchResult;
  }

  /**
   * Process document and generate chunks
   * Workers only prepare data - main pipeline handles embedding generation and storage
   */
  async processDocument(document) {
    try {
      // Simplified processing - just return the document as chunks for main pipeline
      // Main pipeline will handle: embedding generation, advanced chunking, and Pinecone storage
      const chunks = [{
        pageContent: document.pageContent,
        metadata: document.metadata,
        chunkIndex: 0,
        // NOTE: No embedding generation here - main pipeline handles this
        needsEmbedding: true,
        namespace: `${document.metadata.userId}_${document.metadata.repoId}`,
        vectorId: `${document.metadata.repoId}_${document.metadata.filePath}_0`
      }];
      
      // Log processing completion (no storage attempted)
      console.log(`[${new Date().toISOString()}] ✅ WORKER ${this.workerId}: Prepared ${chunks.length} chunks for main pipeline storage`);
      
      return chunks;
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ WORKER ${this.workerId}: Document processing failed:`, error.message);
      throw error;
    }
  }

  /**
   * Store vector in Pinecone - DISABLED for workers
   * Workers only process files, main pipeline handles storage
   * 
   * @deprecated This method is intentionally disabled in workers.
   * Workers should return processed chunks to main pipeline for:
   * - Embedding generation (OpenAI API calls)
   * - Advanced chunking strategies
   * - Pinecone vector storage
   * - Metadata enrichment
   */
  async storePineconeVector(vector, namespace) {
    // NOTE: This method should not be called in current architecture
    console.warn(`[${new Date().toISOString()}] ⚠️ WORKER ${this.workerId}: storePineconeVector() called but workers don't handle storage`);
    console.log(`[${new Date().toISOString()}] 📝 WORKER ${this.workerId}: Vector preparation for namespace ${namespace} completed (main pipeline will handle storage)`);
    return vector;
  }

  /**
   * Check rate limits before processing
   */
  async checkRateLimits() {
    const now = Date.now();
    const oneMinute = 60 * 1000;
    
    // Reset counter if a minute has passed
    if (now - this.globalRateLimit.lastResetTime > oneMinute) {
      this.globalRateLimit.requestsInLastMinute = 0;
      this.globalRateLimit.lastResetTime = now;
    }
    
    // Check if we're approaching rate limit
    if (this.globalRateLimit.requestsInLastMinute >= this.globalRateLimit.maxRequestsPerMinute * 0.8) {
      console.warn(`[${new Date().toISOString()}] ⚠️  WORKER ${this.workerId}: Approaching rate limit, slowing down`);
      
      this.sendMessage({
        type: 'RATE_LIMIT_HIT',
        workerId: this.workerId,
        requestsInLastMinute: this.globalRateLimit.requestsInLastMinute,
        maxRequests: this.globalRateLimit.maxRequestsPerMinute
      });
      
      // Wait longer before processing
      await this.delay(5000); // 5 second delay
    }
    
    // Increment request counter
    this.globalRateLimit.requestsInLastMinute++;
  }

  /**
   * Send message to main thread
   */
  sendMessage(message) {
    if (parentPort) {
      parentPort.postMessage(message);
    }
  }

  /**
   * Utility methods
   */
  
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  getFilePriority(filePath) {
    if (filePath.includes('Plugin.js')) return 100;
    if (filePath.includes('Controller.js')) return 90;
    if (filePath.includes('Service.js')) return 85;
    if (filePath.includes('index.js')) return 80;
    if (filePath.includes('Router.js')) return 75;
    if (filePath.includes('Adapter.js')) return 70;
    if (filePath.includes('.test.js')) return 20;
    return 50;
  }
  
  /**
   * Get worker status
   */
  getStatus() {
    return {
      workerId: this.workerId,
      isProcessing: this.isProcessing,
      currentWorkUnit: this.currentWorkUnit?.id || null,
      processedFiles: this.processedFiles,
      uptime: Date.now() - this.startTime
    };
  }
}

// Worker entry point
if (parentPort) {
  const { workerId, globalRateLimit } = workerData;
  const worker = new RepoWorker(workerId, globalRateLimit);
  
  // Handle messages from main thread
  parentPort.on('message', async (message) => {
    switch (message.type) {
      case 'PROCESS_WORK_UNIT':
        await worker.processWorkUnit(message.jobId, message.workUnit);
        break;
        
      case 'GET_STATUS':
        worker.sendMessage({
          type: 'STATUS_RESPONSE',
          status: worker.getStatus()
        });
        break;
        
      case 'SHUTDOWN':
        console.log(`[${new Date().toISOString()}] 🛑 WORKER ${workerId}: Shutting down gracefully`);
        process.exit(0);
        break;
        
      default:
        console.warn(`[${new Date().toISOString()}] ❓ WORKER ${workerId}: Unknown message type:`, message.type);
    }
  });
  
  // Handle process signals
  process.on('SIGINT', () => {
    console.log(`[${new Date().toISOString()}] 🛑 WORKER ${workerId}: Received SIGINT, shutting down`);
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log(`[${new Date().toISOString()}] 🛑 WORKER ${workerId}: Received SIGTERM, shutting down`);
    process.exit(0);
  });
}

module.exports = RepoWorker;