// pineconePlugin.js - Singleton for Pinecone connection and configuration management
"use strict";

const { Pinecone } = require('@pinecone-database/pinecone');

class PineconePlugin {
  constructor(options = {}) {
    // Return existing instance if already created (singleton pattern)
    if (PineconePlugin.instance) {
      return PineconePlugin.instance;
    }

    this.config = {
      apiKey: options.apiKey || process.env.PINECONE_API_KEY,
      indexName: options.indexName || process.env.PINECONE_INDEX_NAME || 'eventstorm-index',
      region: options.region || process.env.PINECONE_REGION || 'us-central1',
      cloud: options.cloud || 'gcp'
    };

    this.client = null;
    this.index = null;
    this._connected = false;
    this.connectionPromise = null;
    
    this.logger = {
      info: (msg, ...args) => console.log(`[PineconePlugin] ${msg}`, ...args),
      warn: (msg, ...args) => console.warn(`[PineconePlugin] ${msg}`, ...args),
      error: (msg, ...args) => console.error(`[PineconePlugin] ${msg}`, ...args),
      debug: (msg, ...args) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[PineconePlugin:DEBUG] ${msg}`, ...args);
        }
      }
    };

    this._validateConfig();
    
    PineconePlugin.instance = this;
  }

  /**
   * Check if we're in development with invalid API key
   */
  _shouldUseDevelopmentMode() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const hasValidKey = this.config.apiKey && 
      this.config.apiKey !== 'your_pinecone_api_key' && 
      !this.config.apiKey.startsWith('your_');
    
    return isDevelopment && !hasValidKey;
  }

  /**
   * Validate configuration and environment variables
   */
  _validateConfig() {
    if (this._shouldUseDevelopmentMode()) {
      this.logger.info('Running in development mode without valid Pinecone API key - vector search will be disabled');
      return;
    }

    if (!this.config.apiKey) {
      throw new Error('PINECONE_API_KEY is required');
    }

    if (!this.config.indexName) {
      throw new Error('PINECONE_INDEX_NAME is required');
    }

    this.logger.debug('Configuration validated', {
      indexName: this.config.indexName,
      region: this.config.region,
      hasApiKey: !!this.config.apiKey
    });
  }

  /**
   * Get the Pinecone client (creates connection if needed)
   */
  async getClient() {
    if (this._connected && this.client) {
      return this.client;
    }

    // Prevent multiple simultaneous connections
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._connect();
    return this.connectionPromise;
  }

  /**
   * Get the Pinecone index (creates connection if needed)
   */
  async getIndex() {
    if (this._connected && this.index) {
      return this.index;
    }

    await this.getClient(); // Ensure client is connected
    return this.index;
  }

  /**
   * Internal connection logic
   */
  async _connect() {
    try {
      // Check if we're in development mode without valid API key
      if (this._shouldUseDevelopmentMode()) {
        this.logger.info('Development mode detected - creating mock Pinecone connection');
        this._connected = false; // Keep as false to signal no real connection
        throw new Error('Pinecone connection failed: Development mode with invalid API key');
      }

      this.logger.info('Connecting to Pinecone...');
      
      // Initialize Pinecone client
      this.client = new Pinecone({
        apiKey: this.config.apiKey
      });

      // Ensure index exists
      await this._ensureIndexExists();

      // Get index reference
      this.index = this.client.index(this.config.indexName);
      
      this._connected = true;
      this.logger.info(`Successfully connected to Pinecone index: ${this.config.indexName}`);
      
      return this.client;
    } catch (error) {
      this.logger.error('Failed to connect to Pinecone:', error.message);
      this._connected = false;
      this.connectionPromise = null;
      throw new Error(`Pinecone connection failed: ${error.message}`);
    }
  }

  /**
   * Ensure the configured index exists, create if it doesn't
   */
  async _ensureIndexExists() {
    try {
      const existingIndexes = await this.client.listIndexes();
      const indexExists = existingIndexes.indexes?.some(
        idx => idx.name === this.config.indexName
      );
      
      if (!indexExists) {
        this.logger.info(`Index ${this.config.indexName} does not exist, creating...`);
        await this._createIndex();
      } else {
        this.logger.debug(`Index ${this.config.indexName} already exists`);
      }
    } catch (error) {
      this.logger.error('Failed to check/create index:', error.message);
      throw error;
    }
  }

  /**
   * Create index with proper configuration
   */
  async _createIndex() {
    try {
      await this.client.createIndex({
        name: this.config.indexName,
        dimension: 3072, // For text-embedding-3-large
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: this.config.cloud,
            region: this.config.region
          }
        }
      });

      this.logger.info(`Index ${this.config.indexName} created successfully`);
      
      // Wait for index to be ready
      await this._waitForIndexReady();
      
    } catch (error) {
      this.logger.error('Failed to create index:', error.message);
      throw error;
    }
  }

  /**
   * Wait for index to become ready
   */
  async _waitForIndexReady(maxWaitTime = 120000) {
    const startTime = Date.now();
    const checkInterval = 5000;

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const tempIndex = this.client.index(this.config.indexName);
        await tempIndex.describeIndexStats();
        this.logger.info('Index is ready!');
        return true;
      } catch (error) {
        this.logger.debug('Index not ready yet, waiting...');
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }

    throw new Error(`Index ${this.config.indexName} did not become ready within ${maxWaitTime}ms`);
  }

  /**
   * Get index statistics
   */
  async getIndexStats() {
    const index = await this.getIndex();
    return await index.describeIndexStats();
  }

  /**
   * Get connection status
   */
  isConnected() {
    return this._connected && this.client !== null && this.index !== null;
  }

  /**
   * Get configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Gracefully close the connection
   */
  async disconnect() {
    this.client = null;
    this.index = null;
    this._connected = false;
    this.connectionPromise = null;
    this.logger.info('Disconnected from Pinecone');
  }

  /**
   * Reset the singleton (mainly for testing)
   */
  static reset() {
    if (PineconePlugin.instance) {
      PineconePlugin.instance.disconnect();
      PineconePlugin.instance = null;
    }
  }
}

// Ensure only one instance
PineconePlugin.instance = null;

module.exports = PineconePlugin;