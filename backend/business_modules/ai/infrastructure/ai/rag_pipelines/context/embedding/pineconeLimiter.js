const Bottleneck = require("bottleneck");

/**
 * Dedicated Pinecone rate limiter using Bottleneck
 * Handles rate limiting specifically for Pinecone operations (upserts, queries, etc.)
 */
class PineconeLimiter {
  constructor(options = {}) {
    const timestamp = new Date().toISOString();
    
    console.log(`[${timestamp}] [DEBUG] PineconeLimiter constructor starting with options:`, {
      providedOptions: options,
      environment: process.env.NODE_ENV || 'development'
    });

    // Pinecone-specific rate limiting configuration
    // These values are optimized for Pinecone's API limits and performance characteristics
    const config = {
      reservoir: options.reservoir || 100,                    // 100 operations per second (Pinecone's typical limit)
      reservoirRefreshAmount: options.reservoirRefreshAmount || 100,
      reservoirRefreshInterval: options.reservoirRefreshInterval || 1000,  // 1 second
      maxConcurrent: options.maxConcurrent || 5,              // 5 concurrent operations for good performance
      minTime: options.minTime || 10,                         // Minimum 10ms between operations
      maxTime: options.maxTime || 10000,                      // Maximum 10 seconds timeout
      highWater: options.highWater || 50,                     // Queue high water mark
      strategy: options.strategy || Bottleneck.strategy.LEAK  // LEAK strategy for steady processing
    };

    try {
      // Create the Bottleneck limiter with Pinecone-optimized settings
      this.limiter = new Bottleneck(config);
      
      console.log(`[${timestamp}] [DEBUG] Bottleneck limiter created successfully with config:`, config);

      // Set up comprehensive event handlers for monitoring and debugging
      this._setupEventHandlers();
      
      console.log(`[${timestamp}] [DEBUG] PineconeLimiter initialized successfully`);
      
    } catch (error) {
      console.error(`[${timestamp}] [ERROR] PineconeLimiter constructor failed:`, {
        error: error.message,
        stack: error.stack,
        config: config
      });
      throw error;
    }
  }

  /**
   * Set up event handlers for monitoring Bottleneck behavior
   * @private
   */
  _setupEventHandlers() {
    // Error handling
    this.limiter.on('error', (error) => {
      console.error(`[${new Date().toISOString()}] [ERROR] PineconeLimiter error:`, {
        error: error.message,
        stack: error.stack
      });
    });

    // Job failure handling
    this.limiter.on('failed', (error, jobInfo) => {
      console.error(`[${new Date().toISOString()}] [ERROR] PineconeLimiter job failed:`, {
        error: error.message,
        stack: error.stack,
        jobInfo: jobInfo
      });
    });

    // Retry handling
    this.limiter.on('retry', (error, jobInfo) => {
      console.log(`[${new Date().toISOString()}] [WARNING] PineconeLimiter job retrying:`, {
        error: error.message,
        jobInfo: jobInfo,
        retryCount: jobInfo.retryCount
      });
    });

    // Reservoir depletion warning
    this.limiter.on('depleted', (empty) => {
      console.log(`[${new Date().toISOString()}] [WARNING] PineconeLimiter reservoir depleted:`, {
        isEmpty: empty,
        suggestion: 'Consider reducing operation frequency or increasing reservoir size'
      });
    });

    // Debug messages
    this.limiter.on('message', (message) => {
      console.log(`[${new Date().toISOString()}] [DEBUG] PineconeLimiter message:`, message);
    });

    // Queue status monitoring
    this.limiter.on('received', (info) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${new Date().toISOString()}] [DEBUG] PineconeLimiter job received:`, {
          queued: info.queued,
          running: info.running
        });
      }
    });

    // Job execution start
    this.limiter.on('executing', (info) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${new Date().toISOString()}] [DEBUG] PineconeLimiter job executing:`, {
          queued: info.queued,
          running: info.running
        });
      }
    });
  }

  /**
   * Schedule a Pinecone operation with rate limiting
   * @param {Function} operation - The async operation to execute
   * @param {Object} options - Additional Bottleneck options for this specific job
   * @returns {Promise} The result of the operation
   */
  async schedule(operation, options = {}) {
    const timestamp = new Date().toISOString();
    
    try {
      console.log(`[${timestamp}] [DEBUG] Scheduling Pinecone operation with limiter`);
      
      const result = await this.limiter.schedule(options, operation);
      
      console.log(`[${timestamp}] [DEBUG] Pinecone operation completed successfully`);
      return result;
      
    } catch (error) {
      console.error(`[${timestamp}] [ERROR] Pinecone operation failed in limiter:`, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get current limiter status for monitoring
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      queued: this.limiter.queued(),
      running: this.limiter.running(),
      done: this.limiter.done,
      reservoir: this.limiter.reservoir,
      isBlocked: this.limiter.isBlocked(),
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Get limiter configuration
   * @returns {Object} Configuration object
   */
  getConfig() {
    return {
      reservoir: this.limiter.reservoir,
      maxConcurrent: this.limiter.maxConcurrent,
      minTime: this.limiter.minTime,
      strategy: this.limiter.strategy
    };
  }

  /**
   * Disconnect and clean up the limiter
   */
  async disconnect() {
    const timestamp = new Date().toISOString();
    
    try {
      console.log(`[${timestamp}] [DEBUG] Disconnecting PineconeLimiter...`);
      
      if (this.limiter && typeof this.limiter.disconnect === 'function') {
        await this.limiter.disconnect();
        console.log(`[${timestamp}] [DEBUG] PineconeLimiter disconnected successfully`);
      } else {
        console.log(`[${timestamp}] [DEBUG] PineconeLimiter already disconnected or no disconnect method available`);
      }
      
    } catch (error) {
      console.error(`[${timestamp}] [ERROR] Error disconnecting PineconeLimiter:`, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Access to the underlying Bottleneck instance for advanced usage
   * @returns {Bottleneck} The Bottleneck limiter instance
   */
  get bottleneck() {
    return this.limiter;
  }
}

module.exports = PineconeLimiter;