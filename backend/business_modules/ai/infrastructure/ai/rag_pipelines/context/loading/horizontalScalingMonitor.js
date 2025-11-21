// horizontalScalingMonitor.js - Monitor horizontal scaling performance
'use strict';

/**
 * Horizontal Scaling Monitor
 * 
 * Provides real-time monitoring and metrics for the horizontal scaling system
 * including worker performance, rate limiting, and processing statistics.
 */

class HorizontalScalingMonitor {
  constructor(options = {}) {
    this.metricsHistory = [];
    this.workerMetrics = new Map();
    this.processingJobs = new Map();
    this.rateLimitHistory = [];
    
    this.startTime = Date.now();
    this.lastMetricsUpdate = Date.now();
    
    // Configuration
    this.config = {
      historyRetentionTime: options.historyRetentionTime || 3600000, // 1 hour
      metricsInterval: options.metricsInterval || 10000, // 10 seconds
      alertThresholds: {
        workerErrorRate: options.workerErrorRate || 0.1, // 10%
        processingTime: options.processingTime || 300000, // 5 minutes
        rateLimitUtilization: options.rateLimitUtilization || 0.9 // 90%
      }
    };
    
    console.log(`[${new Date().toISOString()}] 📊 MONITOR: Horizontal scaling monitor initialized`);
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    console.log(`[${new Date().toISOString()}] 🔍 MONITOR: Starting horizontal scaling monitoring`);
    
    // Start periodic metrics collection
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
      this.cleanupOldMetrics();
    }, this.config.metricsInterval);
    
    // Start alerts monitoring
    this.alertsInterval = setInterval(() => {
      this.checkAlerts();
    }, 30000); // Check alerts every 30 seconds
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    console.log(`[${new Date().toISOString()}] 🛑 MONITOR: Stopping horizontal scaling monitoring`);
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    if (this.alertsInterval) {
      clearInterval(this.alertsInterval);
    }
  }

  /**
   * Record job start
   */
  recordJobStart(jobId, jobDetails) {
    this.processingJobs.set(jobId, {
      ...jobDetails,
      startTime: Date.now(),
      status: 'running',
      workersAssigned: 0,
      completedUnits: 0,
      failedUnits: 0
    });
    
    console.log(`[${new Date().toISOString()}] 📝 MONITOR: Job ${jobId} started`);
  }

  /**
   * Record job completion
   */
  recordJobCompletion(jobId, result) {
    const job = this.processingJobs.get(jobId);
    if (!job) return;
    
    const processingTime = Date.now() - job.startTime;
    
    const completedJob = {
      ...job,
      ...result,
      endTime: Date.now(),
      processingTime,
      status: result.success ? 'completed' : 'failed'
    };
    
    this.processingJobs.set(jobId, completedJob);
    
    console.log(`[${new Date().toISOString()}] ✅ MONITOR: Job ${jobId} completed in ${processingTime}ms`);
    
    // Move to metrics history after a delay
    setTimeout(() => {
      this.archiveJob(jobId);
    }, 60000); // Archive after 1 minute
  }

  /**
   * Record worker metrics
   */
  recordWorkerMetrics(workerId, metrics) {
    const existing = this.workerMetrics.get(workerId) || {
      created: Date.now(),
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      totalProcessingTime: 0,
      errors: []
    };
    
    this.workerMetrics.set(workerId, {
      ...existing,
      ...metrics,
      lastUpdate: Date.now()
    });
  }

  /**
   * Record rate limit hit
   */
  recordRateLimit(details) {
    this.rateLimitHistory.push({
      timestamp: Date.now(),
      ...details
    });
    
    console.warn(`[${new Date().toISOString()}] ⚠️  MONITOR: Rate limit hit - ${details.reason}`);
  }

  /**
   * Collect system metrics
   */
  collectMetrics() {
    const now = Date.now();
    const uptime = now - this.startTime;
    
    // Calculate active jobs
    const activeJobs = Array.from(this.processingJobs.values()).filter(job => job.status === 'running');
    const completedJobs = Array.from(this.processingJobs.values()).filter(job => job.status === 'completed');
    const failedJobs = Array.from(this.processingJobs.values()).filter(job => job.status === 'failed');
    
    // Calculate worker statistics
    const workerStats = this.calculateWorkerStats();
    
    // Calculate processing statistics
    const processingStats = this.calculateProcessingStats();
    
    // Calculate rate limiting statistics
    const rateLimitStats = this.calculateRateLimitStats();
    
    const metrics = {
      timestamp: now,
      uptime,
      jobs: {
        active: activeJobs.length,
        completed: completedJobs.length,
        failed: failedJobs.length,
        total: this.processingJobs.size
      },
      workers: workerStats,
      processing: processingStats,
      rateLimiting: rateLimitStats,
      memory: this.getMemoryUsage()
    };
    
    this.metricsHistory.push(metrics);
    this.lastMetricsUpdate = now;
    
    // Log summary every 5 minutes
    if (this.metricsHistory.length % 30 === 0) { // 30 * 10 seconds = 5 minutes
      this.logMetricsSummary(metrics);
    }
  }

  /**
   * Calculate worker statistics
   */
  calculateWorkerStats() {
    const workers = Array.from(this.workerMetrics.values());
    
    if (workers.length === 0) {
      return {
        total: 0,
        active: 0,
        idle: 0,
        avgProcessingTime: 0,
        errorRate: 0
      };
    }
    
    const totalJobs = workers.reduce((sum, w) => sum + w.totalJobs, 0);
    const completedJobs = workers.reduce((sum, w) => sum + w.completedJobs, 0);
    const failedJobs = workers.reduce((sum, w) => sum + w.failedJobs, 0);
    const totalProcessingTime = workers.reduce((sum, w) => sum + w.totalProcessingTime, 0);
    
    return {
      total: workers.length,
      active: workers.filter(w => w.status === 'working').length,
      idle: workers.filter(w => w.status === 'idle').length,
      avgProcessingTime: completedJobs > 0 ? totalProcessingTime / completedJobs : 0,
      errorRate: totalJobs > 0 ? failedJobs / totalJobs : 0,
      completedJobs,
      failedJobs
    };
  }

  /**
   * Calculate processing statistics
   */
  calculateProcessingStats() {
    const jobs = Array.from(this.processingJobs.values());
    const completedJobs = jobs.filter(job => job.status === 'completed');
    
    if (completedJobs.length === 0) {
      return {
        totalDocuments: 0,
        totalChunks: 0,
        avgProcessingTime: 0,
        throughputPerMinute: 0
      };
    }
    
    const totalDocuments = completedJobs.reduce((sum, job) => sum + (job.totalDocuments || 0), 0);
    const totalChunks = completedJobs.reduce((sum, job) => sum + (job.totalChunks || 0), 0);
    const totalProcessingTime = completedJobs.reduce((sum, job) => sum + (job.processingTime || 0), 0);
    
    const avgProcessingTime = totalProcessingTime / completedJobs.length;
    const minutesSinceStart = (Date.now() - this.startTime) / 60000;
    const throughputPerMinute = minutesSinceStart > 0 ? totalDocuments / minutesSinceStart : 0;
    
    return {
      totalDocuments,
      totalChunks,
      avgProcessingTime,
      throughputPerMinute,
      completedJobs: completedJobs.length
    };
  }

  /**
   * Calculate rate limiting statistics
   */
  calculateRateLimitStats() {
    const recentRateLimits = this.rateLimitHistory.filter(
      limit => Date.now() - limit.timestamp < 3600000 // Last hour
    );
    
    return {
      rateLimitsLastHour: recentRateLimits.length,
      lastRateLimit: recentRateLimits.length > 0 ? recentRateLimits[recentRateLimits.length - 1] : null,
      rateLimitTypes: this.groupRateLimitsByType(recentRateLimits)
    };
  }

  /**
   * Group rate limits by type
   */
  groupRateLimitsByType(rateLimits) {
    const types = {};
    
    rateLimits.forEach(limit => {
      const type = limit.reason || 'unknown';
      types[type] = (types[type] || 0) + 1;
    });
    
    return types;
  }

  /**
   * Get memory usage
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    
    return {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers
    };
  }

  /**
   * Check for alerts
   */
  checkAlerts() {
    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    if (!latestMetrics) return;
    
    const alerts = [];
    
    // Check worker error rate
    if (latestMetrics.workers.errorRate > this.config.alertThresholds.workerErrorRate) {
      alerts.push({
        type: 'HIGH_WORKER_ERROR_RATE',
        value: latestMetrics.workers.errorRate,
        threshold: this.config.alertThresholds.workerErrorRate,
        message: `Worker error rate (${(latestMetrics.workers.errorRate * 100).toFixed(1)}%) exceeds threshold`
      });
    }
    
    // Check processing time
    if (latestMetrics.processing.avgProcessingTime > this.config.alertThresholds.processingTime) {
      alerts.push({
        type: 'SLOW_PROCESSING',
        value: latestMetrics.processing.avgProcessingTime,
        threshold: this.config.alertThresholds.processingTime,
        message: `Average processing time (${latestMetrics.processing.avgProcessingTime}ms) exceeds threshold`
      });
    }
    
    // Check rate limit utilization
    if (latestMetrics.rateLimiting.rateLimitsLastHour > 0) {
      alerts.push({
        type: 'RATE_LIMIT_HIT',
        value: latestMetrics.rateLimiting.rateLimitsLastHour,
        message: `Rate limit hit ${latestMetrics.rateLimiting.rateLimitsLastHour} times in the last hour`
      });
    }
    
    // Emit alerts
    alerts.forEach(alert => {
      console.warn(`[${new Date().toISOString()}] 🚨 ALERT: ${alert.message}`);
    });
    
    return alerts;
  }

  /**
   * Log metrics summary
   */
  logMetricsSummary(metrics) {
    console.log(`[${new Date().toISOString()}] 📊 METRICS SUMMARY:`);
    console.log(`  Jobs: ${metrics.jobs.active} active, ${metrics.jobs.completed} completed, ${metrics.jobs.failed} failed`);
    console.log(`  Workers: ${metrics.workers.total} total, ${metrics.workers.active} active, error rate: ${(metrics.workers.errorRate * 100).toFixed(1)}%`);
    console.log(`  Processing: ${metrics.processing.totalDocuments} docs, ${metrics.processing.totalChunks} chunks`);
    console.log(`  Throughput: ${metrics.processing.throughputPerMinute.toFixed(1)} docs/minute`);
    console.log(`  Memory: ${Math.round(metrics.memory.heapUsed / 1024 / 1024)}MB used of ${Math.round(metrics.memory.heapTotal / 1024 / 1024)}MB allocated`);
  }

  /**
   * Archive completed job
   */
  archiveJob(jobId) {
    const job = this.processingJobs.get(jobId);
    if (job && job.status !== 'running') {
      this.processingJobs.delete(jobId);
      console.log(`[${new Date().toISOString()}] 📦 MONITOR: Job ${jobId} archived`);
    }
  }

  /**
   * Clean up old metrics
   */
  cleanupOldMetrics() {
    const cutoff = Date.now() - this.config.historyRetentionTime;
    
    this.metricsHistory = this.metricsHistory.filter(metric => metric.timestamp > cutoff);
    this.rateLimitHistory = this.rateLimitHistory.filter(limit => limit.timestamp > cutoff);
    
    // Clean up old worker metrics
    for (const [workerId, worker] of this.workerMetrics) {
      if (worker.lastUpdate && worker.lastUpdate < cutoff) {
        this.workerMetrics.delete(workerId);
      }
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    
    return {
      uptime: Date.now() - this.startTime,
      isMonitoring: !!this.metricsInterval,
      latestMetrics,
      activeJobs: Array.from(this.processingJobs.values()).filter(job => job.status === 'running').length,
      totalMetricsCollected: this.metricsHistory.length,
      lastUpdate: this.lastMetricsUpdate
    };
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const metrics = this.metricsHistory;
    if (metrics.length === 0) return null;
    
    const latest = metrics[metrics.length - 1];
    const oldest = metrics[0];
    const timeSpan = latest.timestamp - oldest.timestamp;
    
    return {
      timeSpan,
      totalJobsProcessed: latest.jobs.completed + latest.jobs.failed,
      totalDocumentsProcessed: latest.processing.totalDocuments,
      totalChunksGenerated: latest.processing.totalChunks,
      averageProcessingTime: latest.processing.avgProcessingTime,
      throughput: latest.processing.throughputPerMinute,
      workerUtilization: latest.workers.total > 0 ? latest.workers.active / latest.workers.total : 0,
      errorRate: latest.workers.errorRate,
      rateLimitHits: latest.rateLimiting.rateLimitsLastHour,
      memoryUsage: latest.memory
    };
  }
}

module.exports = HorizontalScalingMonitor;