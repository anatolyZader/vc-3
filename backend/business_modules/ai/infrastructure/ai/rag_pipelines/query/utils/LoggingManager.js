/**
 * LoggingManager provides structured logging with configurable levels
 * for the QueryPipeline and related components
 */
class LoggingManager {
  constructor(options = {}) {
    this.component = options.component || 'QueryPipeline';
    this.level = options.level || process.env.RAG_LOG_LEVEL || 'INFO';
    this.enableTimestamps = options.enableTimestamps !== false;
    
    // Define log levels with priorities
    this.levels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    };
    
    this.currentLevelPriority = this.levels[this.level] || this.levels.INFO;
  }

  /**
   * Creates a formatted log message with timestamp and component info
   */
  formatMessage(level, message, data = null) {
    const timestamp = this.enableTimestamps ? `[${new Date().toISOString()}]` : '';
    const componentInfo = `[${this.component}]`;
    const levelInfo = `[${level}]`;
    
    let formattedMessage = `${timestamp} ${componentInfo} ${levelInfo} ${message}`;
    
    if (data) {
      formattedMessage += ` ${JSON.stringify(data)}`;
    }
    
    return formattedMessage;
  }

  /**
   * Checks if the given level should be logged based on current log level
   */
  shouldLog(level) {
    return this.levels[level] >= this.currentLevelPriority;
  }

  /**
   * Debug level logging - detailed information for troubleshooting
   */
  debug(message, data = null) {
    if (this.shouldLog('DEBUG')) {
      console.log(this.formatMessage('DEBUG', message, data));
    }
  }

  /**
   * Info level logging - general information about flow
   */
  info(message, data = null) {
    if (this.shouldLog('INFO')) {
      console.log(this.formatMessage('INFO', message, data));
    }
  }

  /**
   * Warning level logging - potentially harmful situations
   */
  warn(message, data = null) {
    if (this.shouldLog('WARN')) {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  /**
   * Error level logging - error events that might still allow the application to continue
   */
  error(message, error = null, data = null) {
    if (this.shouldLog('ERROR')) {
      const errorInfo = error ? { message: error.message, stack: error.stack } : null;
      console.error(this.formatMessage('ERROR', message, { error: errorInfo, ...data }));
    }
  }

  /**
   * Specialized logging methods for RAG operations
   */
  
  ragStatus(status, details = {}) {
    this.info(`RAG Status: ${status}`, details);
  }

  vectorSearch(operation, details = {}) {
    this.debug(`Vector Search: ${operation}`, details);
  }

  contextAnalysis(operation, details = {}) {
    this.debug(`Context Analysis: ${operation}`, details);
  }

  llmGeneration(operation, details = {}) {
    this.debug(`LLM Generation: ${operation}`, details);
  }

  performance(operation, duration, details = {}) {
    this.info(`Performance: ${operation} completed in ${duration}ms`, details);
  }
}

module.exports = LoggingManager;