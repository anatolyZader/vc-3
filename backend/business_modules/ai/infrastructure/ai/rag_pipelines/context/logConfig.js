// logConfig.js - Centralized logging configuration for RAG pipeline
'use strict';

/**
 * Logging configuration for RAG pipeline components
 * Use environment variables to control logging levels
 */
class LogConfig {
  constructor() {
    // Default to minimal logging (errors/warnings only)
    this.enableVerbose = process.env.RAG_VERBOSE_LOGS === 'true';
    this.enableDebug = process.env.RAG_DEBUG_LOGS === 'true';
    this.enableProcessing = process.env.RAG_PROCESSING_LOGS === 'true';
  }

  /**
   * Log verbose processing information (chunking, splitting, analysis)
   */
  logVerbose(message, ...args) {
    if (this.enableVerbose) {
      console.log(message, ...args);
    }
  }

  /**
   * Log debug information (detailed internal state)
   */
  logDebug(message, ...args) {
    if (this.enableDebug) {
      console.log(message, ...args);
    }
  }

  /**
   * Log processing steps (high-level operations)
   */
  logProcessing(message, ...args) {
    if (this.enableProcessing) {
      console.log(message, ...args);
    }
  }

  /**
   * Always log errors and warnings (cannot be disabled)
   */
  logError(message, ...args) {
    console.error(message, ...args);
  }

  logWarn(message, ...args) {
    console.warn(message, ...args);
  }

  /**
   * Always log critical information (cannot be disabled)
   */
  logInfo(message, ...args) {
    console.log(message, ...args);
  }

  /**
   * Get logging status for debugging
   */
  getStatus() {
    return {
      verbose: this.enableVerbose,
      debug: this.enableDebug,
      processing: this.enableProcessing,
      environment: {
        RAG_VERBOSE_LOGS: process.env.RAG_VERBOSE_LOGS,
        RAG_DEBUG_LOGS: process.env.RAG_DEBUG_LOGS,
        RAG_PROCESSING_LOGS: process.env.RAG_PROCESSING_LOGS
      }
    };
  }
}

// Export singleton instance
module.exports = new LogConfig();