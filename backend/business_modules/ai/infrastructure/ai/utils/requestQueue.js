const Bottleneck = require("bottleneck");

/**
 * Handles rate limiting and request queuing for AI operations
 */
class RequestQueue {
  constructor(options = {}) {
    this.maxRequestsPerMinute = options.maxRequestsPerMinute || 60;
    this.retryDelay = options.retryDelay || 5000;
    this.maxRetries = options.maxRetries || 10;
    
    // Rate limiting parameters
    this.requestsInLastMinute = 0;
    this.lastRequestTime = Date.now();
    
    // Request queue system
    this.requestQueue = [];
    this.isProcessingQueue = false;
    
    // Bottleneck rate limiter for Pinecone upserts
    this.pineconeLimiter = new Bottleneck({
      reservoir: 100, // 100 records per second
      reservoirRefreshAmount: 100,
      reservoirRefreshInterval: 1000,
      maxConcurrent: 1
    });
    
    console.log(`[${new Date().toISOString()}] [DEBUG] RequestQueue initialized: maxRequestsPerMinute=${this.maxRequestsPerMinute}, retryDelay=${this.retryDelay}, maxRetries=${this.maxRetries}`);
    console.log(`[${new Date().toISOString()}] [DEBUG] Bottleneck limiter initialized.`);
    console.log(`[${new Date().toISOString()}] [DEBUG] Request queue initialized.`);
    
    // Start queue processor
    this.startQueueProcessor();
    console.log(`[${new Date().toISOString()}] [DEBUG] Queue processor started.`);
  }

  /**
   * Check if we're within rate limits
   */
  async checkRateLimit() {
    const now = Date.now();
    const timeWindow = 60 * 1000; // 1 minute in milliseconds

    // Reset counter if more than a minute has passed
    if (now - this.lastRequestTime > timeWindow) {
      this.requestsInLastMinute = 0;
      this.lastRequestTime = now;
      return true;
    }

    // If we're still under the limit, increment and allow
    if (this.requestsInLastMinute < this.maxRequestsPerMinute) {
      this.requestsInLastMinute++;
      this.lastRequestTime = now;
      return true;
    }

    // Otherwise, we need to wait
    console.log(`[${new Date().toISOString()}] Rate limit reached, delaying request`);
    return false;
  }

  /**
   * Wait with exponential backoff and jitter
   */
  async waitWithBackoff(retryCount) {
    // Base delay plus linear component to ensure minimum wait time increases with retries
    const baseDelay = this.retryDelay + (retryCount * 5000);

    // Add jitter (±10%) to prevent thundering herd problem
    const jitterFactor = 0.9 + (Math.random() * 0.2);

    // Calculate final delay with max cap
    const delay = Math.min(
      baseDelay * jitterFactor,
      60000 // Max 60 seconds
    );

    console.log(`[${new Date().toISOString()}] Waiting ${Math.round(delay)}ms before retry ${retryCount + 1}`);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Add a request to the queue
   */
  queueRequest(execute) {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).substring(2, 10);

      this.requestQueue.push({
        id: requestId,
        execute,
        resolve,
        reject,
        timestamp: new Date().toISOString()
      });

      console.log(`[${new Date().toISOString()}] Added request ${requestId} to queue, queue length: ${this.requestQueue.length}`);

      // Trigger queue processing if not already running
      if (!this.isProcessingQueue) {
        setTimeout(() => this.processQueue(), 100);
      }
    });
  }

  /**
   * Start the queue processor
   */
  startQueueProcessor() {
    // Process queue every 5 seconds
    setInterval(() => this.processQueue(), 5000);
    console.log(`[${new Date().toISOString()}] AI request queue processor started`);
  }

  /**
   * Process the request queue
   */
  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;

    this.isProcessingQueue = true;
    console.log(`[${new Date().toISOString()}] Processing AI request queue, ${this.requestQueue.length} items pending`);

    try {
      // Get the next request from the queue
      const request = this.requestQueue.shift();

      // Check if we're within rate limits
      if (await this.checkRateLimit()) {
        console.log(`[${new Date().toISOString()}] Processing queued request: ${request.id}`);

        try {
          // Execute the request
          const result = await request.execute();

          // Resolve the promise with the result
          request.resolve(result);
        } catch (error) {
          // If the request fails, reject the promise
          request.reject(error);
        }
      } else {
        // If we're rate limited, put the request back at the front of the queue
        console.log(`[${new Date().toISOString()}] Rate limited, requeueing request: ${request.id}`);
        this.requestQueue.unshift(request);

        // Wait before processing more
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } finally {
      this.isProcessingQueue = false;

      // If there are more items in the queue, process them
      if (this.requestQueue.length > 0) {
        setTimeout(() => this.processQueue(), 1000);
      }
    }
  }

  /**
   * Get queue status for monitoring
   */
  getQueueStatus() {
    return {
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessingQueue,
      requestsInLastMinute: this.requestsInLastMinute,
      maxRequestsPerMinute: this.maxRequestsPerMinute,
      lastRequestTime: this.lastRequestTime
    };
  }
}

module.exports = RequestQueue;
