// Example: Refactored AI Pubsub Adapter
// Uses generic transport instead of direct GCP Pub/Sub client
'use strict';

class AIPubsubAdapter {
  constructor({ transport, logger }) {
    this.transport = transport;
    this.log = logger;
    this.aiTopic = 'ai-topic';
  }

  /**
   * Publish an AI event
   * @param {string} event - Event name (e.g., 'answerAdded', 'repoProcessed')
   * @param {object} payload - Event payload
   * @returns {Promise<string>} - Message ID
   */
  async publishAiResponse(event, payload) {
    try {
      // Construct the message with event type
      const message = {
        event: event,
        timestamp: new Date().toISOString(),
        ...payload  // Spread payload directly at root level
      };

      // Use generic transport - works with both Redis and GCP Pub/Sub
      const messageId = await this.transport.publish(this.aiTopic, message);
      
      this.log.info({ event, messageId, topic: this.aiTopic }, 'AI event published');
      return messageId;
    } catch (error) {
      this.log.error({ event, error }, 'Error publishing AI event');
      throw error;
    }
  }
  
  /**
   * Publish repository processing completion
   * @param {string} userId 
   * @param {string} repoId 
   * @param {object} result 
   * @returns {Promise<string>}
   */
  async publishRepoProcessed(userId, repoId, result) {
    return this.publishAiResponse('repoProcessed', {
      userId,
      repoId,
      result
    });
  }
  
  /**
   * Publish answer to chat module
   * @param {string} userId 
   * @param {string} conversationId 
   * @param {string} answer 
   * @returns {Promise<string>}
   */
  async publishAnswerAdded(userId, conversationId, answer) {
    return this.publishAiResponse('answerAdded', {
      userId,
      conversationId,
      answer
    });
  }
}

module.exports = AIPubsubAdapter;
