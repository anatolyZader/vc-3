// requestQueue.js
"use strict";

const PineconeLimiter = require('./rag_pipelines/context/embedding/pineconeLimiter');

/**
 * Handles rate limiting and request queuing for AI operations
 */
class RequestQueue {
  constructor(options = {}) {
    const timestamp = new Date().toISOString();
    
    console.log(`[${timestamp}] [DEBUG] RequestQueue constructor starting with options:`, {
      providedOptions: options,
      environment: process.env.NODE_ENV || 'development'
    });

    try {
      this.maxRequestsPerMinute = options.maxRequestsPerMinute || 120;  // Increased from 60 to 120 for better throughput
      this.retryDelay = options.retryDelay || 2000;  // Reduced from 5000ms to 2000ms for faster retries
      this.maxRetries = options.maxRetries || 10;
      
      console.log(`[${timestamp}] [DEBUG] Configuration set:`, {
        maxRequestsPerMinute: this.maxRequestsPerMinute,
        retryDelay: this.retryDelay,
        maxRetries: this.maxRetries
      });
      
      // Rate limiting parameters
      this.requestsInLastMinute = 0;
      this.lastRequestTime = Date.now();
      
      console.log(`[${timestamp}] [DEBUG] Rate limiting initialized:`, {
        requestsInLastMinute: this.requestsInLastMinute,
        lastRequestTime: this.lastRequestTime,
        lastRequestTimeReadable: new Date(this.lastRequestTime).toISOString()
      });
      
      // Request queue system
      this.requestQueue = [];
      this.isProcessingQueue = false;
      
      console.log(`[${timestamp}] [DEBUG] Queue system initialized:`, {
        queueLength: this.requestQueue.length,
        isProcessingQueue: this.isProcessingQueue
      });
      
      // Initialize specialized Pinecone rate limiter
      try {
        this.pineconeLimiter = new PineconeLimiter({
          reservoir: options.pineconeReservoir || 100,                    // 100 operations per second
          reservoirRefreshAmount: options.pineconeRefreshAmount || 100,   
          reservoirRefreshInterval: options.pineconeRefreshInterval || 1000,  // 1 second
          maxConcurrent: options.pineconeMaxConcurrent || 5               // 5 concurrent for performance
        });
        
        console.log(`[${timestamp}] [DEBUG] PineconeLimiter initialized successfully`);
      } catch (pineconeLimiterError) {
        console.error(`[${timestamp}] [ERROR] Failed to create PineconeLimiter:`, {
          error: pineconeLimiterError.message,
          stack: pineconeLimiterError.stack
        });
        throw pineconeLimiterError;
      }
      
      console.log(`[${timestamp}] [DEBUG] RequestQueue initialized: maxRequestsPerMinute=${this.maxRequestsPerMinute}, retryDelay=${this.retryDelay}, maxRetries=${this.maxRetries}`);
      console.log(`[${timestamp}] [DEBUG] Bottleneck limiter initialized.`);
      console.log(`[${timestamp}] [DEBUG] Request queue initialized.`);
      
      // Start queue processor
      this.startQueueProcessor();
      console.log(`[${timestamp}] [DEBUG] Queue processor started.`);
      
      console.log(`[${timestamp}] [DEBUG] RequestQueue initialization completed successfully`);
      
    } catch (error) {
      console.error(`[${timestamp}] [ERROR] RequestQueue constructor failed:`, {
        error: error.message,
        stack: error.stack,
        options: options
      });
      throw error;
    }
  }

  /**
   * Check if we're within rate limits
   */
  async checkRateLimit() {
    const now = Date.now();
    const timeWindow = 60 * 1000; // 1 minute in milliseconds
    const timestamp = new Date().toISOString();
    
    console.log(`[${timestamp}] [DEBUG] Checking rate limit:`, {
      now,
      nowReadable: new Date(now).toISOString(),
      lastRequestTime: this.lastRequestTime,
      lastRequestTimeReadable: new Date(this.lastRequestTime).toISOString(),
      requestsInLastMinute: this.requestsInLastMinute,
      maxRequestsPerMinute: this.maxRequestsPerMinute,
      timeWindow,
      timeSinceLastRequest: now - this.lastRequestTime
    });

    // Reset counter if more than a minute has passed
    if (now - this.lastRequestTime > timeWindow) {
      console.log(`[${timestamp}] [DEBUG] Resetting rate limit counter - time window exceeded:`, {
        timeSinceLastRequest: now - this.lastRequestTime,
        timeWindow,
        oldRequestsCount: this.requestsInLastMinute,
        newRequestsCount: 0
      });
      
      this.requestsInLastMinute = 0;
      this.lastRequestTime = now;
      return true;
    }

    // If we're still under the limit, increment and allow
    if (this.requestsInLastMinute < this.maxRequestsPerMinute) {
      this.requestsInLastMinute++;
      this.lastRequestTime = now;
      
      console.log(`[${timestamp}] [DEBUG] Rate limit check passed:`, {
        newRequestCount: this.requestsInLastMinute,
        maxAllowed: this.maxRequestsPerMinute,
        newLastRequestTime: this.lastRequestTime,
        newLastRequestTimeReadable: new Date(this.lastRequestTime).toISOString(),
        remainingRequests: this.maxRequestsPerMinute - this.requestsInLastMinute
      });
      
      return true;
    }

    // Otherwise, we need to wait
    console.log(`[${timestamp}] [WARNING] Rate limit reached, delaying request:`, {
      currentRequests: this.requestsInLastMinute,
      maxRequests: this.maxRequestsPerMinute,
      timeUntilReset: timeWindow - (now - this.lastRequestTime),
      lastRequestTime: this.lastRequestTime,
      lastRequestTimeReadable: new Date(this.lastRequestTime).toISOString()
    });
    
    return false;
  }

  /**
   * Wait with exponential backoff and jitter
   */
  async waitWithBackoff(retryCount) {
    const timestamp = new Date().toISOString();
    
    console.log(`[${timestamp}] [DEBUG] Starting waitWithBackoff:`, {
      retryCount,
      baseRetryDelay: this.retryDelay,
      maxRetries: this.maxRetries
    });
    
    try {
      // Base delay plus linear component to ensure minimum wait time increases with retries
      const baseDelay = this.retryDelay + (retryCount * 5000);

      // Add jitter (±10%) to prevent thundering herd problem
      const jitterFactor = 0.9 + (Math.random() * 0.2);

      // Calculate final delay with max cap
      const delay = Math.min(
        baseDelay * jitterFactor,
        60000 // Max 60 seconds
      );

      console.log(`[${timestamp}] [DEBUG] Calculated backoff delay:`, {
        retryCount,
        baseDelay,
        jitterFactor,
        finalDelay: Math.round(delay),
        maxDelay: 60000,
        delayInSeconds: Math.round(delay / 1000)
      });

      console.log(`[${timestamp}] [INFO] Waiting ${Math.round(delay)}ms before retry ${retryCount + 1}/${this.maxRetries}`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`[${timestamp}] [DEBUG] Backoff wait completed for retry ${retryCount + 1}`);
      
    } catch (error) {
      console.error(`[${timestamp}] [ERROR] Error during waitWithBackoff:`, {
        error: error.message,
        stack: error.stack,
        retryCount
      });
      throw error;
    }
  }

  /**
   * Add a request to the queue
   */
  queueRequest(execute) {
    const timestamp = new Date().toISOString();
    
    console.log(`[${timestamp}] [DEBUG] queueRequest called:`, {
      executeFunction: typeof execute,
      currentQueueLength: this.requestQueue.length,
      isProcessingQueue: this.isProcessingQueue
    });
    
    return new Promise((resolve, reject) => {
      try {
        const requestId = Math.random().toString(36).substring(2, 10);

        const requestData = {
          id: requestId,
          execute,
          resolve,
          reject,
          timestamp: new Date().toISOString()
        };

        this.requestQueue.push(requestData);

        console.log(`[${timestamp}] [INFO] Added request ${requestId} to queue:`, {
          requestId,
          queueLength: this.requestQueue.length,
          requestTimestamp: requestData.timestamp,
          isProcessingQueue: this.isProcessingQueue
        });

        // Trigger queue processing if not already running
        if (!this.isProcessingQueue) {
          console.log(`[${timestamp}] [DEBUG] Triggering queue processing for request ${requestId}`);
          setTimeout(() => this.processQueue(), 100);
        } else {
          console.log(`[${timestamp}] [DEBUG] Queue processing already running, request ${requestId} will wait`);
        }
        
      } catch (error) {
        console.error(`[${timestamp}] [ERROR] Failed to queue request:`, {
          error: error.message,
          stack: error.stack,
          executeFunction: typeof execute
        });
        reject(error);
      }
    });
  }

  /**
   * Start the queue processor
   */
  startQueueProcessor() {
    const timestamp = new Date().toISOString();
    
    console.log(`[${timestamp}] [DEBUG] Starting queue processor with 1-second interval for faster response times`);
    
    try {
      // Process queue every 1 second for better responsiveness
      const intervalId = setInterval(() => {
        try {
          this.processQueue();
        } catch (error) {
          console.error(`[${new Date().toISOString()}] [ERROR] Queue processor interval error:`, {
            error: error.message,
            stack: error.stack
          });
        }
      }, 1000);
      
      console.log(`[${timestamp}] [INFO] AI request queue processor started successfully:`, {
        intervalMs: 1000,
        intervalId: intervalId.toString()
      });
      
      // Store interval ID for potential cleanup
      this.processorIntervalId = intervalId;
      
    } catch (error) {
      console.error(`[${timestamp}] [ERROR] Failed to start queue processor:`, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Process the request queue
   */
  async processQueue() {
    const timestamp = new Date().toISOString();
    
    // Early exit if already processing or queue is empty
    if (this.isProcessingQueue) {
      // Only log processing status in development to reduce noise in production logs
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${timestamp}] [DEBUG] processQueue skipped - already processing`);
      }
      return;
    }
    
    if (this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    
    console.log(`[${timestamp}] [INFO] Starting to process AI request queue:`, {
      queueLength: this.requestQueue.length,
      isProcessingQueue: this.isProcessingQueue,
      requestsInLastMinute: this.requestsInLastMinute,
      maxRequestsPerMinute: this.maxRequestsPerMinute
    });

    let request = null;
    
    try {
      // Get the next request from the queue
      request = this.requestQueue.shift();
      
      if (!request) {
        console.log(`[${timestamp}] [WARNING] No request found after shift, queue may have been processed by another call`);
        return;
      }

      console.log(`[${timestamp}] [DEBUG] Processing request:`, {
        requestId: request.id,
        requestTimestamp: request.timestamp,
        queueLengthRemaining: this.requestQueue.length,
        requestAge: Date.now() - new Date(request.timestamp).getTime()
      });

      // Check if we're within rate limits
      const rateLimitCheck = await this.checkRateLimit();
      
      if (rateLimitCheck) {
        console.log(`[${timestamp}] [INFO] Rate limit passed, executing request: ${request.id}`);

        try {
          // Execute the request
          const executionStart = Date.now();
          const result = await request.execute();
          const executionTime = Date.now() - executionStart;

          console.log(`[${timestamp}] [INFO] Request executed successfully:`, {
            requestId: request.id,
            executionTime,
            resultType: typeof result,
            hasResult: result !== undefined && result !== null
          });

          // Resolve the promise with the result
          request.resolve(result);
          
        } catch (requestError) {
          console.error(`[${timestamp}] [ERROR] Request execution failed:`, {
            requestId: request.id,
            error: requestError.message,
            stack: requestError.stack,
            requestTimestamp: request.timestamp
          });
          
          // If the request fails, reject the promise
          request.reject(requestError);
        }
        
      } else {
        // If we're rate limited, put the request back at the front of the queue
        console.log(`[${timestamp}] [WARNING] Rate limited, requeueing request:`, {
          requestId: request.id,
          queueLengthBeforeRequeue: this.requestQueue.length,
          currentRequests: this.requestsInLastMinute,
          maxRequests: this.maxRequestsPerMinute
        });
        
        this.requestQueue.unshift(request);

        console.log(`[${timestamp}] [DEBUG] Request requeued, waiting before next processing:`, {
          newQueueLength: this.requestQueue.length,
          waitTime: 5000
        });

        // Wait before processing more
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
    } catch (processingError) {
      console.error(`[${timestamp}] [ERROR] Queue processing error:`, {
        error: processingError.message,
        stack: processingError.stack,
        requestId: request?.id || 'unknown',
        queueLength: this.requestQueue.length
      });
      
      // If we have a request and it failed due to processing error, reject it
      if (request && typeof request.reject === 'function') {
        request.reject(processingError);
      }
      
    } finally {
      this.isProcessingQueue = false;
      
      console.log(`[${timestamp}] [DEBUG] Queue processing completed:`, {
        remainingQueueLength: this.requestQueue.length,
        isProcessingQueue: this.isProcessingQueue
      });

      // If there are more items in the queue, schedule next processing
      if (this.requestQueue.length > 0) {
        console.log(`[${timestamp}] [DEBUG] Scheduling next queue processing:`, {
          remainingItems: this.requestQueue.length,
          delayMs: 1000
        });
        
        setTimeout(() => {
          try {
            this.processQueue();
          } catch (scheduleError) {
            console.error(`[${new Date().toISOString()}] [ERROR] Error scheduling next queue processing:`, {
              error: scheduleError.message,
              stack: scheduleError.stack
            });
          }
        }, 1000);
      } else {
        console.log(`[${timestamp}] [DEBUG] Queue is empty, no further processing scheduled`);
      }
    }
  }

  /**
   * Get queue status for monitoring
   */
  getQueueStatus() {
    const timestamp = new Date().toISOString();
    
    const status = {
      timestamp,
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessingQueue,
      requestsInLastMinute: this.requestsInLastMinute,
      maxRequestsPerMinute: this.maxRequestsPerMinute,
      lastRequestTime: this.lastRequestTime,
      lastRequestTimeReadable: new Date(this.lastRequestTime).toISOString(),
      timeSinceLastRequest: Date.now() - this.lastRequestTime,
      remainingCapacity: this.maxRequestsPerMinute - this.requestsInLastMinute,
      rateLimitResetIn: Math.max(0, 60000 - (Date.now() - this.lastRequestTime)),
      config: {
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay
      }
    };
    
    console.log(`[${timestamp}] [DEBUG] Queue status requested:`, status);
    
    return status;
  }

  /**
   * Cleanup method to stop processors and clear queues
   */
  async cleanup() {
    const timestamp = new Date().toISOString();
    
    console.log(`[${timestamp}] [INFO] Starting RequestQueue cleanup:`, {
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessingQueue,
      hasProcessorInterval: !!this.processorIntervalId
    });

    try {
      // Clear the processor interval
      if (this.processorIntervalId) {
        clearInterval(this.processorIntervalId);
        console.log(`[${timestamp}] [DEBUG] Processor interval cleared`);
      }

      // Reject any pending requests
      if (this.requestQueue.length > 0) {
        console.log(`[${timestamp}] [WARNING] Rejecting ${this.requestQueue.length} pending requests during cleanup`);
        
        this.requestQueue.forEach((request, index) => {
          try {
            request.reject(new Error('RequestQueue cleanup - operation cancelled'));
            console.log(`[${timestamp}] [DEBUG] Rejected pending request ${index + 1}: ${request.id}`);
          } catch (rejectError) {
            console.error(`[${timestamp}] [ERROR] Failed to reject request ${request.id}:`, {
              error: rejectError.message
            });
          }
        });
      }

      // Clear the queue
      this.requestQueue = [];
      this.isProcessingQueue = false;

      // Disconnect PineconeLimiter if available
      if (this.pineconeLimiter && typeof this.pineconeLimiter.disconnect === 'function') {
        await this.pineconeLimiter.disconnect();
        console.log(`[${timestamp}] [DEBUG] PineconeLimiter disconnected`);
      }

      console.log(`[${timestamp}] [INFO] RequestQueue cleanup completed successfully`);
      
    } catch (cleanupError) {
      console.error(`[${timestamp}] [ERROR] Error during RequestQueue cleanup:`, {
        error: cleanupError.message,
        stack: cleanupError.stack
      });
    }
  }
}

module.exports = RequestQueue;
