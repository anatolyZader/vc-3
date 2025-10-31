// RepoWorkerManager.js - Horizontal scaling manager for large repositoryy processing
'use strict';

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path');
const os = require('os');
const FileFilteringUtils = require('../embedding/FileFilteringUtils');

/**
 * Repository Worker Manager - Coordinates multiple workers for large repository processing
 * 
 * Features:
 * - Automatic worker pool management
 * - Intelligent work distribution
 * - Rate limit coordination across workers
 * - Progress tracking and monitoring
 * - Failure handling and retry logic
 */
class RepoWorkerManager {
  constructor(options = {}) {
    this.maxWorkers = options.maxWorkers || Math.min(os.cpus().length, 4); // Limit to 4 workers max
    this.workers = new Map();
    this.workQueue = [];
    this.activeJobs = new Map();
    this.completedJobs = new Map();
    this.failedJobs = new Map();
    
    // Worker lifecycle tracking
    this.workerStats = {
      created: 0,
      active: 0,
      idle: 0,
      terminated: 0,
      errors: 0
    };
    
    // Rate limiting coordination
    this.globalRateLimit = {
      requestsInLastMinute: 0,
      lastResetTime: Date.now(),
      maxRequestsPerMinute: options.maxRequestsPerMinute || 300 // Shared across all workers
    };
    
    console.log(`[${new Date().toISOString()}] 🏭 WORKER MANAGER: Initialized with max ${this.maxWorkers} workers`);
  }

  /**
   * Process large repository with horizontal scaling
   * Returns processed chunks to main pipeline for embedding storage
   */
  async processLargeRepository(repositoryJob, embeddingManager = null, textSearchService = null) {
    const { repoId, userId, githubOwner, repoName } = repositoryJob;
    const jobId = `${repoId}_${Date.now()}`;
    
    console.log(`[${new Date().toISOString()}] 🚀 WORKER MANAGER: Starting large repo processing for ${repoId}`);
    console.log(`[${new Date().toISOString()}] 📊 Job ID: ${jobId}`);
    
    try {
      // Step 1: Analyze repository structure and create work units
      const workUnits = await this.createWorkUnits(repositoryJob);
      console.log(`[${new Date().toISOString()}] 📦 WORK UNITS: Created ${workUnits.length} processing units`);
      
      // Step 2: Initialize worker pool
      await this.initializeWorkers();
      
      // Step 3: Distribute work across workers
      const processingPromise = this.distributeWork(jobId, workUnits);
      
      // Step 4: Monitor progress
      const monitoringPromise = this.monitorProgress(jobId, workUnits.length);
      
      // Step 5: Wait for completion
      await Promise.all([processingPromise, monitoringPromise]);
      
      // Step 6: Aggregate results
      const aggregatedResult = await this.aggregateResults(jobId);
      
      // Step 7: NEW - Handle embedding storage if embeddingManager provided
      if (embeddingManager && aggregatedResult.processedChunks?.length > 0) {
        console.log(`[${new Date().toISOString()}] 🧠 WORKER MANAGER: Processing ${aggregatedResult.processedChunks.length} chunks for embedding storage`);
        
        try {
          // TEMPORARY FIX: Hardcode the actual namespace that exists in Pinecone
          const namespace = `d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3`;
          console.log(`[${new Date().toISOString()}] [DEBUG] TEMP FIX: Using hardcoded namespace: ${namespace}`);
          await embeddingManager.storeToPinecone(
            aggregatedResult.processedChunks,
            namespace,
            githubOwner,
            repoName
          );
          
          aggregatedResult.embeddingStorageSuccess = true;
          console.log(`[${new Date().toISOString()}] ✅ WORKER MANAGER: Successfully stored embeddings to namespace ${namespace}`);
          
          // Also store to PostgreSQL for full-text search if textSearchService available
          if (textSearchService) {
            try {
              console.log(`[${new Date().toISOString()}] 💾 WORKER MANAGER: Storing ${aggregatedResult.processedChunks.length} chunks to PostgreSQL...`);
              const storeResult = await textSearchService.storeChunks(
                aggregatedResult.processedChunks, 
                userId, 
                repoId
              );
              console.log(`[${new Date().toISOString()}] ✅ WORKER MANAGER: PostgreSQL storage: ${storeResult.stored} chunks stored, ${storeResult.skipped} skipped`);
              aggregatedResult.postgresStorageSuccess = true;
              aggregatedResult.postgresStored = storeResult.stored;
            } catch (pgError) {
              console.error(`[${new Date().toISOString()}] ⚠️  WORKER MANAGER: PostgreSQL storage failed (non-fatal):`, pgError.message);
              aggregatedResult.postgresStorageSuccess = false;
              aggregatedResult.postgresStorageError = pgError.message;
            }
          }
          
        } catch (embeddingError) {
          console.error(`[${new Date().toISOString()}] ❌ WORKER MANAGER: Embedding storage failed:`, embeddingError.message);
          aggregatedResult.embeddingStorageSuccess = false;
          aggregatedResult.embeddingStorageError = embeddingError.message;
        }
      } else if (aggregatedResult.processedChunks?.length > 0) {
        console.warn(`[${new Date().toISOString()}] ⚠️ WORKER MANAGER: ${aggregatedResult.processedChunks.length} chunks processed but no embeddingManager provided for storage`);
        aggregatedResult.embeddingStorageSuccess = false;
        aggregatedResult.embeddingStorageError = 'No embedding manager provided';
      }
      
      console.log(`[${new Date().toISOString()}] ✅ WORKER MANAGER: Completed processing for ${repoId}`);
      console.log(`[${new Date().toISOString()}] 📊 Results: ${aggregatedResult.totalDocuments} docs, ${aggregatedResult.totalChunks} chunks`);
      
      return {
        success: true,
        jobId,
        ...aggregatedResult,
        processingTime: Date.now() - this.activeJobs.get(jobId)?.startTime,
        workersUsed: this.workerStats.active
      };
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ WORKER MANAGER: Failed processing ${repoId}:`, error.message);
      this.failedJobs.set(jobId, { error, timestamp: Date.now() });
      
      return {
        success: false,
        jobId,
        error: error.message,
        processingTime: Date.now() - (this.activeJobs.get(jobId)?.startTime || Date.now())
      };
    } finally {
      // Cleanup
      await this.terminateWorkers();
    }
  }

  /**
   * Create intelligent work units from repository structure
   */
  async createWorkUnits(repositoryJob) {
    const { branch, githubOwner, repoName } = repositoryJob;
    
    // Get repository tree structure
    const treeData = await this.getRepositoryTree(githubOwner, repoName, branch);
    
    // Filter and group files intelligently
    const sourceFiles = treeData.filter(item => 
      item.type === 'blob' && 
      this.isProcessableFile(item.path) &&
      item.path.includes('backend/') // Focus on backend files
    );
    
    // Create balanced work units
    const workUnits = this.createBalancedWorkUnits(sourceFiles, repositoryJob);
    
    return workUnits;
  }

  /**
   * Create balanced work units to distribute load evenly
   */
  createBalancedWorkUnits(files, repositoryJob) {
    const filesPerUnit = Math.ceil(files.length / this.maxWorkers);
    const workUnits = [];
    
    for (let i = 0; i < files.length; i += filesPerUnit) {
      const unitFiles = files.slice(i, i + filesPerUnit);
      
      // Prioritize files within each unit
      unitFiles.sort((a, b) => this.getFilePriority(b.path) - this.getFilePriority(a.path));
      
      workUnits.push({
        id: `unit_${workUnits.length + 1}`,
        files: unitFiles,
        repositoryJob,
        priority: Math.max(...unitFiles.map(f => this.getFilePriority(f.path))),
        estimatedProcessingTime: this.estimateProcessingTime(unitFiles)
      });
    }
    
    // Sort work units by priority (high priority first)
    workUnits.sort((a, b) => b.priority - a.priority);
    
    return workUnits;
  }

  /**
   * Initialize worker pool
   */
  async initializeWorkers() {
    console.log(`[${new Date().toISOString()}] 👷 WORKERS: Initializing ${this.maxWorkers} workers`);
    
    const workerPromises = [];
    
    for (let i = 0; i < this.maxWorkers; i++) {
      const workerPromise = this.createWorker(i);
      workerPromises.push(workerPromise);
    }
    
    await Promise.all(workerPromises);
    
    console.log(`[${new Date().toISOString()}] ✅ WORKERS: ${this.workers.size} workers ready`);
  }

  /**
   * Create individual worker
   */
  async createWorker(workerId) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, 'repoWorker.js'), {
        workerData: { 
          workerId,
          globalRateLimit: this.globalRateLimit
        }
      });

      // Handle worker messages
      worker.on('message', (message) => {
        this.handleWorkerMessage(workerId, message);
      });

      // Handle worker errors
      worker.on('error', (error) => {
        console.error(`[${new Date().toISOString()}] ❌ WORKER ${workerId}: Error:`, error);
        this.workerStats.errors++;
        this.workers.delete(workerId);
      });

      // Handle worker exit
      worker.on('exit', (code) => {
        console.log(`[${new Date().toISOString()}] 🚪 WORKER ${workerId}: Exited with code ${code}`);
        this.workerStats.terminated++;
        this.workers.delete(workerId);
      });

      // Worker ready
      worker.on('online', () => {
        this.workers.set(workerId, {
          worker,
          status: 'idle',
          currentJob: null,
          completedJobs: 0,
          errors: 0,
          startTime: Date.now()
        });
        
        this.workerStats.created++;
        this.workerStats.idle++;
        
        console.log(`[${new Date().toISOString()}] ✅ WORKER ${workerId}: Online and ready`);
        resolve(worker);
      });
    });
  }

  /**
   * Distribute work units across available workers
   */
  async distributeWork(jobId, workUnits) {
    this.activeJobs.set(jobId, {
      startTime: Date.now(),
      totalUnits: workUnits.length,
      completedUnits: 0,
      failedUnits: 0,
      results: []
    });

    const processingPromises = [];
    
    // Distribute work units
    for (const workUnit of workUnits) {
      const promise = this.assignWorkUnit(jobId, workUnit);
      processingPromises.push(promise);
    }
    
    // Wait for all work units to complete
    const results = await Promise.allSettled(processingPromises);
    
    return results;
  }

  /**
   * Assign work unit to available worker
   */
  async assignWorkUnit(jobId, workUnit) {
    return new Promise((resolve, reject) => {
      // Find available worker
      const availableWorker = this.getAvailableWorker();
      
      if (!availableWorker) {
        // Queue work if no workers available
        this.workQueue.push({ jobId, workUnit, resolve, reject });
        return;
      }

      // Assign work to worker
      const { workerId, worker } = availableWorker;
      
      this.workers.get(workerId).status = 'working';
      this.workers.get(workerId).currentJob = workUnit.id;
      this.workerStats.active++;
      this.workerStats.idle--;
      
      // Send work to worker
      worker.worker.postMessage({
        type: 'PROCESS_WORK_UNIT',
        jobId,
        workUnit
      });

      // Set timeout for work unit
      const timeout = setTimeout(() => {
        console.warn(`[${new Date().toISOString()}] ⏰ WORKER ${workerId}: Work unit ${workUnit.id} timed out`);
        reject(new Error(`Work unit ${workUnit.id} timed out`));
      }, workUnit.estimatedProcessingTime * 2); // 2x estimated time

      // Store completion handlers
      worker.completionHandlers = worker.completionHandlers || new Map();
      worker.completionHandlers.set(workUnit.id, { resolve, reject, timeout });
    });
  }

  /**
   * Handle messages from workers
   */
  handleWorkerMessage(workerId, message) {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    switch (message.type) {
      case 'WORK_UNIT_COMPLETED':
        this.handleWorkUnitCompleted(workerId, message);
        break;
        
      case 'WORK_UNIT_FAILED':
        this.handleWorkUnitFailed(workerId, message);
        break;
        
      case 'PROGRESS_UPDATE':
        this.handleProgressUpdate(workerId, message);
        break;
        
      case 'RATE_LIMIT_HIT':
        this.handleRateLimitHit(workerId, message);
        break;
        
      default:
        console.log(`[${new Date().toISOString()}] 📨 WORKER ${workerId}: Unknown message:`, message.type);
    }
  }

  /**
   * Handle work unit completion
   * Now properly collects processed chunks for embedding storage
   */
  handleWorkUnitCompleted(workerId, message) {
    const worker = this.workers.get(workerId);
    const { jobId, workUnitId, result } = message;
    
    // Update worker status
    worker.status = 'idle';
    worker.currentJob = null;
    worker.completedJobs++;
    this.workerStats.active--;
    this.workerStats.idle++;
    
    // Update job progress and collect processed chunks
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.completedUnits++;
      
      // Transform worker results to include processed chunks for main pipeline
      const enhancedResult = {
        ...result,
        // Extract processed chunks from file results for embedding storage
        processedChunks: this.extractProcessedChunks(result)
      };
      
      job.results.push(enhancedResult);
    }
    
    // Resolve work unit promise
    if (worker.completionHandlers?.has(workUnitId)) {
      const handlers = worker.completionHandlers.get(workUnitId);
      clearTimeout(handlers.timeout);
      handlers.resolve(result);
      worker.completionHandlers.delete(workUnitId);
    }
    
    // Process queued work if any
    this.processWorkQueue();
  }

  /**
   * Extract processed chunks from worker results for main pipeline embedding
   */
  extractProcessedChunks(workerResult) {
    const processedChunks = [];
    
    if (workerResult.filesProcessed) {
      for (const fileResult of workerResult.filesProcessed) {
        if (fileResult.success && fileResult.processedChunks?.length > 0) {
          // Extract actual chunk objects returned by workers
          for (const chunk of fileResult.processedChunks) {
            processedChunks.push({
              pageContent: chunk.pageContent,
              metadata: {
                ...chunk.metadata,
                // Enrich with manager-level metadata
                processedByWorker: true,
                extractedAt: new Date().toISOString(),
                managerJobId: workerResult.workUnitId
              }
            });
          }
        }
      }
    }
    
    return processedChunks;
  }

  /**
   * Handle work unit failure
   */
  handleWorkUnitFailed(workerId, message) {
    const worker = this.workers.get(workerId);
    const { jobId, workUnitId, error } = message;
    
    console.error(`[${new Date().toISOString()}] ❌ WORKER ${workerId}: Failed work unit ${workUnitId}:`, error);
    
    // Update worker status
    worker.status = 'idle';
    worker.currentJob = null;
    worker.errors++;
    this.workerStats.active--;
    this.workerStats.idle++;
    
    // Update job progress
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.failedUnits++;
    }
    
    // Reject work unit promise
    if (worker.completionHandlers?.has(workUnitId)) {
      const handlers = worker.completionHandlers.get(workUnitId);
      clearTimeout(handlers.timeout);
      handlers.reject(new Error(error));
      worker.completionHandlers.delete(workUnitId);
    }
    
    // Process queued work if any
    this.processWorkQueue();
  }

  /**
   * Handle progress update from worker
   */
  handleProgressUpdate(workerId, message) {
    const { jobId, workUnitId, progress } = message;
    
    // Update job progress tracking if needed
    const job = this.activeJobs.get(jobId);
    if (job && progress) {
      // Store progress information for monitoring
      job.progressUpdates = job.progressUpdates || {};
      job.progressUpdates[workUnitId] = {
        ...progress,
        timestamp: Date.now(),
        workerId
      };
    }
  }

  /**
   * Handle rate limit hit from worker
   */
  handleRateLimitHit(workerId, message) {
    const { retryAfter, endpoint } = message;
    
    console.warn(`[${new Date().toISOString()}] ⚠️ WORKER ${workerId}: Rate limit hit on ${endpoint}, retry after ${retryAfter}s`);
    
    // Implement rate limit backoff strategy
    const worker = this.workers.get(workerId);
    if (worker) {
      // Temporarily disable worker
      worker.status = 'rate_limited';
      worker.rateLimitRetryAfter = Date.now() + (retryAfter * 1000);
      
      // Re-enable worker after rate limit period
      setTimeout(() => {
        if (worker.status === 'rate_limited') {
          worker.status = 'idle';
          console.log(`[${new Date().toISOString()}] ✅ WORKER ${workerId}: Rate limit expired, worker available`);
        }
      }, retryAfter * 1000);
    }
  }

  /**
   * Process queued work units
   */
  processWorkQueue() {
    if (this.workQueue.length === 0) return;
    
    const availableWorker = this.getAvailableWorker();
    if (!availableWorker) return;
    
    const queuedWork = this.workQueue.shift();
    if (queuedWork) {
      this.assignWorkUnit(queuedWork.jobId, queuedWork.workUnit)
        .then(queuedWork.resolve)
        .catch(queuedWork.reject);
    }
  }

  /**
   * Get available worker
   */
  getAvailableWorker() {
    for (const [workerId, worker] of this.workers) {
      if (worker.status === 'idle') {
        return { workerId, worker };
      }
    }
    return null;
  }

  /**
   * Monitor job progress
   */
  async monitorProgress(jobId, totalUnits) {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const job = this.activeJobs.get(jobId);
        if (!job) {
          clearInterval(interval);
          resolve();
          return;
        }
        
        const progress = {
          completed: job.completedUnits,
          failed: job.failedUnits,
          total: totalUnits,
          percentage: Math.round((job.completedUnits + job.failedUnits) / totalUnits * 100),
          activeWorkers: this.workerStats.active,
          queuedWork: this.workQueue.length
        };
        
        console.log(`[${new Date().toISOString()}] 📊 JOB ${jobId}: Progress ${progress.percentage}% (${progress.completed}/${progress.total})`);
        
        // Check if job is complete
        if (progress.completed + progress.failed >= totalUnits) {
          clearInterval(interval);
          resolve(progress);
        }
      }, 5000); // Update every 5 seconds
    });
  }

  /**
   * Aggregate results from all workers
   * Now includes collecting processed chunks for main pipeline embedding storage
   */
  async aggregateResults(jobId) {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    const aggregated = {
      totalDocuments: 0,
      totalChunks: 0,
      successfulUnits: 0,
      failedUnits: job.failedUnits,
      processingErrors: [],
      // NEW: Collect all processed chunks for main pipeline storage
      processedChunks: [],
      documentsForEmbedding: []
    };
    
    for (const result of job.results) {
      if (result.success) {
        aggregated.totalDocuments += result.documentsProcessed || 0;
        aggregated.totalChunks += result.chunksGenerated || 0;
        aggregated.successfulUnits++;
        
        // NEW: Collect chunks that need embedding generation and storage
        if (result.allProcessedChunks?.length > 0) {
          // Prefer batch-level aggregated chunks for better performance
          aggregated.processedChunks.push(...result.allProcessedChunks);
        } else if (result.filesProcessed) {
          // Fallback to file-level chunk extraction
          for (const fileResult of result.filesProcessed) {
            if (fileResult.success && fileResult.processedChunks?.length > 0) {
              aggregated.processedChunks.push(...fileResult.processedChunks);
            }
          }
        }
      } else {
        aggregated.processingErrors.push(result.error);
      }
    }
    
    console.log(`[${new Date().toISOString()}] 📊 AGGREGATION: Collected ${aggregated.processedChunks.length} chunks for embedding storage`);
    
    // Move to completed jobs
    this.completedJobs.set(jobId, {
      ...aggregated,
      completedAt: Date.now(),
      totalProcessingTime: Date.now() - job.startTime
    });
    
    this.activeJobs.delete(jobId);
    
    return aggregated;
  }

  /**
   * Terminate all workers
   */
  async terminateWorkers() {
    console.log(`[${new Date().toISOString()}] 🛑 WORKERS: Terminating ${this.workers.size} workers`);
    
    const terminationPromises = [];
    
    for (const [, workerData] of this.workers) {
      const promise = workerData.worker.terminate();
      terminationPromises.push(promise);
    }
    
    await Promise.all(terminationPromises);
    
    this.workers.clear();
    this.workerStats.active = 0;
    this.workerStats.idle = 0;
    
    console.log(`[${new Date().toISOString()}] ✅ WORKERS: All workers terminated`);
  }

  /**
   * Utility methods
   */
  
  async getRepositoryTree(owner, repo, branch) {
    const headers = {};
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
      headers['User-Agent'] = 'eventstorm-worker-manager';
    }
    
    // CRITICAL FIX: The git/trees API requires a SHA, not a branch name
    // First, resolve the branch to its commit SHA
    console.log(`[${new Date().toISOString()}] 🔍 WORKER MANAGER: Resolving branch '${branch}' to commit SHA for ${owner}/${repo}`);
    const branchResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/${branch}`, {
      headers
    });
    
    if (!branchResponse.ok) {
      throw new Error(`Failed to resolve branch ${branch}: ${branchResponse.status} ${branchResponse.statusText}`);
    }
    
    const branchData = await branchResponse.json();
    const commitSha = branchData.commit.sha;
    console.log(`[${new Date().toISOString()}] ✅ WORKER MANAGER: Branch '${branch}' resolved to SHA: ${commitSha.substring(0, 7)}`);
    
    // Now fetch the tree using the commit SHA
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get repository tree: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`[${new Date().toISOString()}] 📂 WORKER MANAGER: Retrieved ${data.tree.length} files from repository tree`);
    return data.tree;
  }
  
  isProcessableFile(path) {
    // Use centralized filtering logic that includes test exclusions
    return FileFilteringUtils.shouldIndexFile(path);
  }
  
  getFilePriority(filePath) {
    if (filePath.includes('Plugin.js')) return 100;
    if (filePath.includes('Controller.js')) return 90;
    if (filePath.includes('Service.js')) return 85;
    if (filePath.includes('index.js')) return 80;
    if (filePath.includes('Router.js')) return 75;
    if (filePath.includes('Adapter.js')) return 70;
    // Test files are now filtered out by FileFilteringUtils
    return 50;
  }
  
  estimateProcessingTime(files) {
    const baseTime = 10000; // 10 seconds base
    const timePerFile = 2000; // 2 seconds per file
    return baseTime + (files.length * timePerFile);
  }

  /**
   * Get worker manager status
   */
  getStatus() {
    return {
      workers: {
        total: this.workers.size,
        active: Array.from(this.workers.values()).filter(w => w.status === 'working').length,
        idle: Array.from(this.workers.values()).filter(w => w.status === 'idle').length
      },
      jobs: {
        active: this.activeJobs.size,
        completed: this.completedJobs.size,
        failed: this.failedJobs.size
      },
      queue: {
        pending: this.workQueue.length
      },
      stats: this.workerStats
    };
  }
}

module.exports = RepoWorkerManager;