// pineconePlugin.js - Singleton pattern for shared Pinecone connections
"use strict";

const PineconeService = require('./PineconeService');

/**
 * PineconePlugin - Singleton pattern for shared Pinecone connections
 * 
 * This class ensures that only one PineconeService instance is created and shared
 * across all processors, reducing memory usage and connection overhead.
 */
class PineconePlugin {
  constructor(options = {}) {
    // Return existing instance if already created (singleton pattern)
    if (PineconePlugin.instance) {
      return PineconePlugin.instance;
    }

    this.pineconeService = null;
    this.isInitialized = false;
    this.initializationPromise = null;
    
    PineconePlugin.instance = this;
  }

  /**
   * Get the shared Pinecone service instance
   */
  async getPineconeService(options = {}) {
    if (this.isInitialized && this.pineconeService) {
      return this.pineconeService;
    }

    // Prevent multiple simultaneous initializations
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initializePineconeService(options);
    return this.initializationPromise;
  }

  /**
   * Initialize the Pinecone service once
   */
  async _initializePineconeService(options = {}) {
    if (!process.env.PINECONE_API_KEY) {
      console.warn(`[${new Date().toISOString()}] PineconePlugin: No API key found, returning null`);
      return null;
    }

    try {
      console.log(`[${new Date().toISOString()}] PineconePlugin: Initializing shared Pinecone service...`);
      
      this.pineconeService = new PineconeService({
        rateLimiter: options.rateLimiter || options.pineconeLimiter
      });

      await this.pineconeService.initialize(); // Ensure connection is established
      
      this.isInitialized = true;
      console.log(`[${new Date().toISOString()}] PineconePlugin: Shared Pinecone service initialized successfully`);
      
      return this.pineconeService;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] PineconePlugin: Failed to initialize:`, error.message);
      this.initializationPromise = null; // Allow retry
      throw error;
    }
  }

  /**
   * Get connection status
   */
  isConnected() {
    return this.isInitialized && this.pineconeService !== null;
  }

  /**
   * Gracefully close the connection
   */
  async close() {
    if (this.pineconeService && this.pineconeService.close) {
      await this.pineconeService.close();
    }
    this.pineconeService = null;
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  /**
   * Reset the singleton (mainly for testing)
   */
  static reset() {
    if (PineconePlugin.instance) {
      PineconePlugin.instance.close();
      PineconePlugin.instance = null;
    }
  }
}

// Ensure only one instance
PineconePlugin.instance = null;

module.exports = PineconePlugin;