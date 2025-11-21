// horizontalScalingConfig.js - Configuration for horizontal scaling
'use strict';

/**
 * Horizontal Scaling Configuration
 * 
 * This file contains all configuration settings for the horizontal scaling system
 * including worker management, rate limiting, and processing thresholds.
 */

const os = require('os');

const HorizontalScalingConfig = {
  // Worker Management
  workers: {
    // Maximum number of workers to spawn
    maxWorkers: Math.min(os.cpus().length, 4), // Limit to 4 workers max
    
    // Minimum number of workers for large repos
    minWorkers: 2,
    
    // Worker timeout for individual work units (milliseconds)
    workUnitTimeout: 300000, // 5 minutes per work unit
    
    // Worker startup timeout
    startupTimeout: 30000 // 30 seconds
  },

  // Repository Analysis Thresholds
  thresholds: {
    // File count threshold for triggering horizontal scaling
    fileCountThreshold: 50,
    
    // Repository size threshold in KB
    repoSizeThreshold: 1000, // 1MB
    
    // Complex file patterns that increase processing complexity
    complexFilePatterns: [
      'Controller.js',
      'Plugin.js',
      'Service.js',
      'Adapter.js'
    ],
    
    // High priority file extensions
    priorityExtensions: ['.js', '.ts', '.jsx', '.tsx'],
    
    // Files to exclude from processing
    excludePatterns: [
      /node_modules\//,
      /\.git\//,
      /dist\//,
      /build\//,
      /coverage\//,
      /\.log$/,
      /\.(png|jpg|jpeg|gif|ico|svg)$/i,
      /\.DS_Store$/,
      /package-lock\.json$/,
      /yarn\.lock$/
    ]
  },

  // Batch Processing
  batching: {
    // Files per batch for workers
    filesPerBatch: 3,
    
    // Delay between batches (milliseconds)
    batchDelay: 1500,
    
    // Delay between files within a batch (milliseconds)
    fileDelay: 500,
    
    // Maximum retries for failed batches
    maxBatchRetries: 3,
    
    // Retry delay multiplier (exponential backoff)
    retryDelayMultiplier: 2
  },

  // Rate Limiting
  rateLimiting: {
    // Global rate limit across all workers (requests per minute)
    globalRequestsPerMinute: 300,
    
    // Per-worker rate limit (requests per minute)
    workerRequestsPerMinute: 100,
    
    // GitHub API specific limits
    github: {
      // GitHub API rate limit (requests per hour)
      requestsPerHour: 5000,
      
      // Buffer to stay below rate limit (percentage)
      rateLimitBuffer: 0.8, // Use 80% of available rate limit
      
      // Delay when approaching rate limit (milliseconds)
      rateLimitDelay: 5000,
      
      // Cool-down period after rate limit hit (milliseconds)
      rateLimitCooldown: 60000 // 1 minute
    }
  },

  // Processing Strategy
  processing: {
    // Priority scoring weights
    priorityWeights: {
      'Plugin.js': 100,
      'Controller.js': 90,
      'Service.js': 85,
      'index.js': 80,
      'Router.js': 75,
      'Adapter.js': 70,
      'config': 60,
      'default': 50,
      'test': 20
    },
    
    // Chunk size for document processing
    chunkSize: 2000,
    
    // Overlap between chunks
    chunkOverlap: 200,
    
    // Enable semantic preprocessing
    enableSemanticPreprocessing: true,
    
    // Enable AST-based code splitting
    enableASTSplitting: true
  },

  // Monitoring and Logging
  monitoring: {
    // Progress update interval (milliseconds)
    progressUpdateInterval: 5000,
    
    // Enable detailed logging
    enableDetailedLogging: true,
    
    // Enable performance metrics
    enableMetrics: true,
    
    // Metric collection interval (milliseconds)
    metricsInterval: 10000,
    
    // Enable worker health monitoring
    enableHealthMonitoring: true,
    
    // Health check interval (milliseconds)
    healthCheckInterval: 30000
  },

  // Cloud Environment
  cloud: {
    // Cloud Run specific settings
    cloudRun: {
      // Maximum concurrent requests per instance
      maxConcurrentRequests: 4,
      
      // Memory limit per instance (MB)
      memoryLimit: 2048,
      
      // CPU limit per instance
      cpuLimit: 2,
      
      // Request timeout (seconds)
      requestTimeout: 900 // 15 minutes
    },
    
    // Pinecone settings
    pinecone: {
      // Batch upsert size
      batchUpsertSize: 100,
      
      // Retry configuration
      maxRetries: 3,
      retryDelay: 1000,
      
      // Connection pool size
      connectionPoolSize: 10
    }
  },

  // Fallback Configuration
  fallback: {
    // Enable automatic fallback to standard processing
    enableAutoFallback: true,
    
    // Maximum worker failures before fallback
    maxWorkerFailures: 2,
    
    // Maximum processing time before fallback (milliseconds)
    maxProcessingTime: 1800000, // 30 minutes
    
    // Fallback strategy options: 'standard', 'single_worker', 'disabled'
    fallbackStrategy: 'standard'
  },

  // Development/Testing
  development: {
    // Use mock data for testing
    useMockData: process.env.NODE_ENV === 'development',
    
    // Enable debug mode
    enableDebugMode: process.env.DEBUG === 'true',
    
    // Test repository settings
    testRepo: {
      owner: 'myzader',
      name: 'eventstorm',
      branch: 'main',
      maxTestFiles: 10
    }
  }
};

/**
 * Get configuration based on environment
 */
function getConfig(environment = process.env.NODE_ENV) {
  const baseConfig = { ...HorizontalScalingConfig };
  
  // Environment-specific overrides
  switch (environment) {
    case 'production':
      return {
        ...baseConfig,
        workers: {
          ...baseConfig.workers,
          maxWorkers: 4 // Full worker count in production
        },
        monitoring: {
          ...baseConfig.monitoring,
          enableDetailedLogging: false // Reduce log verbosity in production
        }
      };
      
    case 'staging':
      return {
        ...baseConfig,
        workers: {
          ...baseConfig.workers,
          maxWorkers: 2 // Limited workers in staging
        },
        rateLimiting: {
          ...baseConfig.rateLimiting,
          globalRequestsPerMinute: 200 // Conservative rate limiting
        }
      };
      
    case 'development':
    case 'test':
      return {
        ...baseConfig,
        workers: {
          ...baseConfig.workers,
          maxWorkers: 2, // Limited workers for development
          workUnitTimeout: 60000 // Shorter timeout for testing
        },
        thresholds: {
          ...baseConfig.thresholds,
          fileCountThreshold: 5 // Lower threshold for testing
        },
        monitoring: {
          ...baseConfig.monitoring,
          enableDetailedLogging: true // Full logging in development
        }
      };
      
    default:
      return baseConfig;
  }
}

/**
 * Validate configuration settings
 */
function validateConfig(config) {
  const errors = [];
  
  // Worker validation
  if (config.workers.maxWorkers < 1) {
    errors.push('maxWorkers must be at least 1');
  }
  
  if (config.workers.maxWorkers > 8) {
    errors.push('maxWorkers should not exceed 8 for stability');
  }
  
  // Threshold validation
  if (config.thresholds.fileCountThreshold < 1) {
    errors.push('fileCountThreshold must be at least 1');
  }
  
  // Rate limiting validation
  if (config.rateLimiting.globalRequestsPerMinute < 10) {
    errors.push('globalRequestsPerMinute must be at least 10');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }
  
  return true;
}

module.exports = {
  HorizontalScalingConfig,
  getConfig,
  validateConfig
};