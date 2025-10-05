// RepoWorkerManager.js - Horizontal scaling manager for large repository processing
'use strict';

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path');
const os = require('os');

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
   */
  async processLargeRepository(repositoryJob) {
    const { repoId } = repositoryJob;
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
      
      console.log(`[${new Date().toISOString()}] 📤 WORKER ${workerId}: Assigned work unit ${workUnit.id}`);
      
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
   */
  handleWorkUnitCompleted(workerId, message) {
    const worker = this.workers.get(workerId);
    const { jobId, workUnitId, result } = message;
    
    console.log(`[${new Date().toISOString()}] ✅ WORKER ${workerId}: Completed work unit ${workUnitId}`);
    
    // Update worker status
    worker.status = 'idle';
    worker.currentJob = null;
    worker.completedJobs++;
    this.workerStats.active--;
    this.workerStats.idle++;
    
    // Update job progress
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.completedUnits++;
      job.results.push(result);
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
    
    console.log(`[${new Date().toISOString()}] 📊 WORKER ${workerId}: Progress update for ${workUnitId}: ${progress?.percentage || 'unknown'}%`);
    
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
      processingErrors: []
    };
    
    for (const result of job.results) {
      if (result.success) {
        aggregated.totalDocuments += result.documentsProcessed || 0;
        aggregated.totalChunks += result.chunksGenerated || 0;
        aggregated.successfulUnits++;
      } else {
        aggregated.processingErrors.push(result.error);
      }
    }
    
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
    
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get repository tree: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.tree;
  }
  
  isProcessableFile(path) {
    const excludePatterns = [
      /node_modules\//,
      /\.git\//,
      /dist\//,
      /build\//,
      /coverage\//,
      /\.log$/,
      /\.(png|jpg|jpeg|gif|ico|svg)$/i,
      /\.DS_Store$/
    ];
    
    for (const pattern of excludePatterns) {
      if (pattern.test(path)) return false;
    }
    
    const sourceExtensions = /\.(js|ts|jsx|tsx|json|md|sql|yaml|yml|txt|env)$/i;
    return sourceExtensions.test(path);
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