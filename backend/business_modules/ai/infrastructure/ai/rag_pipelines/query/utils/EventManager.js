const LoggingManager = require('./LoggingManager');

/**
 * EventManager handles RAG status events for monitoring and observability
 * Provides clean separation of event emission concerns
 */
class EventManager {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.userId = options.userId;
    this.logger = new LoggingManager({ component: 'EventManager' });
    this.enableEvents = options.enableEvents !== false; // Enable by default
  }

  /**
   * Emits RAG status events for monitoring
   */
  emitRagStatus(status, data = {}) {
    if (!this.enableEvents) {
      return;
    }

    if (this.eventBus && this.eventBus.emit) {
      const eventData = {
        status,
        timestamp: new Date().toISOString(),
        userId: this.userId,
        ...data
      };
      
      this.eventBus.emit('ragStatus', eventData);
      this.logger.ragStatus(`Emitted RAG status: ${status}`, eventData);
    } else {
      this.logger.warn('EventBus not available for event emission', { status, data });
    }
  }

  /**
   * Emits retrieval success event with document details
   */
  emitRetrievalSuccess(documentsFound, sources, sourceTypes, firstDocContentPreview) {
    this.emitRagStatus('retrieval_success', {
      documentsFound,
      sources,
      sourceTypes,
      firstDocContentPreview
    });
  }

  /**
   * Emits retrieval timeout fallback event
   */
  emitRetrievalTimeoutFallback(error, query) {
    this.emitRagStatus('retrieval_timeout_fallback', {
      error: error.message,
      query: query.substring(0, 100)
    });
  }

  /**
   * Emits processing started event
   */
  emitProcessingStarted(conversationId, prompt) {
    this.emitRagStatus('processing_started', {
      conversationId,
      prompt: prompt.substring(0, 200) // Truncate for privacy
    });
  }

  /**
   * Emits processing completed event
   */
  emitProcessingCompleted(conversationId, responseLength, ragEnabled, contextSize, sourcesUsed) {
    this.emitRagStatus('processing_completed', {
      conversationId,
      responseLength,
      ragEnabled,
      contextSize,
      sourcesUsed
    });
  }

  /**
   * Emits processing error event
   */
  emitProcessingError(conversationId, error, prompt) {
    this.emitRagStatus('processing_error', {
      conversationId,
      error: error.message,
      prompt: prompt.substring(0, 100)
    });
  }

  /**
   * Emits retrieval error event
   */
  emitRetrievalError(error, query) {
    this.emitRagStatus('retrieval_error', {
      error: error.message,
      query: query.substring(0, 100)
    });
  }

  /**
   * Sets the user ID for future events
   */
  setUserId(userId) {
    this.userId = userId;
    this.logger.debug('Updated user ID for events', { userId });
  }

  /**
   * Enables or disables event emission
   */
  setEventsEnabled(enabled) {
    this.enableEvents = enabled;
    this.logger.info(`Event emission ${enabled ? 'enabled' : 'disabled'}`);
  }
}

module.exports = EventManager;