// transport/redisTransportAdapter.js
// Redis-based transport adapter
'use strict';

class RedisTransportAdapter {
  constructor(redisClient, logger) {
    this.redis = redisClient;
    this.log = logger;
    this.subscribers = new Map(); // topic → { subscriber, handler }
    this.isInitialized = false;
  }
  
  async initialize() {
    if (this.isInitialized) {
      return;
    }
    
    this.log.info('Initializing Redis transport adapter...');
    this.isInitialized = true;
  }
  
  /**
   * Publish a message to a topic
   * @param {string} topic - Topic name
   * @param {object} message - Message payload (will be JSON stringified)
   * @returns {Promise<string>} - Message ID
   */
  async publish(topic, message) {
    if (!this.isInitialized) {
      throw new Error('Transport not initialized');
    }
    
    try {
      const payload = JSON.stringify(message);
      await this.redis.publish(topic, payload);
      
      const messageId = `redis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.log.debug({ topic, messageId }, '[Redis Transport] Published message');
      
      return messageId;
    } catch (error) {
      this.log.error({ topic, error }, '[Redis Transport] Publish failed');
      throw error;
    }
  }
  
  /**
   * Subscribe to a topic with a message handler
   * @param {string} topic - Topic name
   * @param {function} handler - Message handler: async (message) => void
   *                             message = { id, data, timestamp, ack, nack }
   * @returns {Promise<void>}
   */
  async subscribe(topic, handler) {
    if (!this.isInitialized) {
      throw new Error('Transport not initialized');
    }
    
    if (this.subscribers.has(topic)) {
      this.log.warn({ topic }, '[Redis Transport] Already subscribed to topic');
      return;
    }
    
    try {
      // Create dedicated subscriber connection (Redis requires separate connection for pub/sub)
      const subscriber = this.redis.duplicate();
      // Note: duplicate() creates a new client in the same state (connected/disconnected)
      // If original is connected, duplicate is also connected automatically
      
      // Set up message handler - ioredis message event: (channel, message)
      subscriber.on('message', async (channel, rawMessage) => {
        if (channel !== topic) return; // Only handle messages for this topic
        
        try {
          const messageId = `msg-${Date.now()}`;
          
          // Parse message
          let parsedMessage;
          try {
            parsedMessage = JSON.parse(rawMessage);
          } catch (parseError) {
            this.log.error({ topic, messageId, rawMessage }, '[Redis Transport] Failed to parse message');
            return; // Skip malformed messages
          }
          
          // Create standardized message object
          const message = {
            id: messageId,
            data: parsedMessage,
            timestamp: new Date(),
            // NOTE: Redis Pub/Sub has no retry/DLQ; ack/nack are logging-only in dev.
            // For production reliability, use GCP Pub/Sub transport which provides real ack/nack.
            ack: async () => {
              this.log.debug({ topic, messageId }, '[Redis Transport] Message acknowledged');
            },
            nack: async () => {
              this.log.warn({ topic, messageId }, '[Redis Transport] Message not acknowledged');
              // Redis Pub/Sub doesn't support nack/retry, just log it
            }
          };
          
          // Call handler
          await handler(message);
          
        } catch (error) {
          this.log.error({ topic, error }, '[Redis Transport] Message handler error');
        }
      });
      
      // Actually subscribe to the topic
      await subscriber.subscribe(topic);
      
      this.subscribers.set(topic, { subscriber, handler });
      this.log.info({ topic }, '[Redis Transport] Subscribed to topic');
      
    } catch (error) {
      this.log.error({ topic, error }, '[Redis Transport] Subscribe failed');
      throw error;
    }
  }
  
  /**
   * Unsubscribe from a topic
   * @param {string} topic - Topic name
   * @returns {Promise<void>}
   */
  async unsubscribe(topic) {
    const sub = this.subscribers.get(topic);
    if (!sub) {
      return;
    }
    
    try {
      await sub.subscriber.unsubscribe(topic);
      await sub.subscriber.quit();
      this.subscribers.delete(topic);
      this.log.info({ topic }, '[Redis Transport] Unsubscribed from topic');
    } catch (error) {
      this.log.error({ topic, error }, '[Redis Transport] Unsubscribe failed');
    }
  }
  
  /**
   * Close all subscriptions and cleanup
   * @returns {Promise<void>}
   */
  async close() {
    this.log.info('[Redis Transport] Closing all subscriptions...');
    
    const closePromises = Array.from(this.subscribers.keys()).map(topic => 
      this.unsubscribe(topic)
    );
    
    await Promise.all(closePromises);
    this.isInitialized = false;
    this.log.info('[Redis Transport] Closed');
  }
}

module.exports = RedisTransportAdapter;
