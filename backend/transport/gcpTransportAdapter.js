// transport/gcpTransportAdapter.js
// GCP Pub/Sub transport adapter
'use strict';

const { PubSub } = require('@google-cloud/pubsub');

class GcpTransportAdapter {
  constructor(logger) {
    this.log = logger;
    this.pubsub = null;
    this.subscriptions = new Map(); // topic → subscription object
    this.isInitialized = false;
  }
  
  async initialize() {
    if (this.isInitialized) {
      return;
    }
    
    this.log.info('Initializing GCP Pub/Sub transport adapter...');
    this.pubsub = new PubSub();
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
      const topicRef = this.pubsub.topic(topic);
      const payload = JSON.stringify(message);
      const messageBuffer = Buffer.from(payload);
      
      const messageId = await topicRef.publishMessage({ data: messageBuffer });
      this.log.debug({ topic, messageId }, '[GCP Transport] Published message');
      
      return messageId;
    } catch (error) {
      this.log.error({ topic, error }, '[GCP Transport] Publish failed');
      throw error;
    }
  }
  
  /**
   * Subscribe to a topic with a message handler
   * @param {string} subscriptionName - Subscription name (not topic name!)
   * @param {function} handler - Message handler: async (message) => void
   *                             message = { id, data, timestamp, ack, nack }
   * @returns {Promise<void>}
   */
  async subscribe(subscriptionName, handler) {
    if (!this.isInitialized) {
      throw new Error('Transport not initialized');
    }
    
    if (this.subscriptions.has(subscriptionName)) {
      this.log.warn({ subscriptionName }, '[GCP Transport] Already subscribed');
      return;
    }
    
    try {
      const subscription = this.pubsub.subscription(subscriptionName);
      
      // Set up message handler
      subscription.on('message', async (gcpMessage) => {
        try {
          // Parse message
          let parsedData;
          try {
            const rawData = gcpMessage.data.toString();
            parsedData = JSON.parse(rawData);
          } catch (parseError) {
            this.log.error({ subscriptionName, messageId: gcpMessage.id }, '[GCP Transport] Failed to parse message');
            gcpMessage.ack(); // Ack malformed messages to remove them
            return;
          }
          
          // Create standardized message object
          const message = {
            id: gcpMessage.id,
            data: parsedData,
            timestamp: gcpMessage.publishTime,
            ack: async () => gcpMessage.ack(),
            nack: async () => gcpMessage.nack()
          };
          
          // Call handler
          await handler(message);
          
        } catch (error) {
          this.log.error({ subscriptionName, error }, '[GCP Transport] Message handler error');
          // Let the error propagate to trigger nack if handler throws
          throw error;
        }
      });
      
      // Set up error handler
      subscription.on('error', (error) => {
        this.log.error({ subscriptionName, error }, '[GCP Transport] Subscription error');
      });
      
      this.subscriptions.set(subscriptionName, subscription);
      this.log.info({ subscriptionName }, '[GCP Transport] Subscribed');
      
    } catch (error) {
      this.log.error({ subscriptionName, error }, '[GCP Transport] Subscribe failed');
      throw error;
    }
  }
  
  /**
   * Close all subscriptions and cleanup
   * @returns {Promise<void>}
   */
  async close() {
    this.log.info('[GCP Transport] Closing all subscriptions...');
    
    // GCP Pub/Sub subscriptions don't need explicit cleanup
    this.subscriptions.clear();
    this.isInitialized = false;
    this.log.info('[GCP Transport] Closed');
  }
}

module.exports = GcpTransportAdapter;
