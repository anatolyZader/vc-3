// infrastructure/messaging/pubsub/aiPubsubAdapter.js
'use strict';

const pubSubClient = require('../../../../../aop/messaging/pubsub/pubsubClient');

class aiPubsubAdapter {
  async publish(topic, payload) {
    try {
      // Get a reference to the topic. The topic name should match the one defined in GCP.
      const topicRef = pubSubClient.topic(topic);
      const messageBuffer = Buffer.from(JSON.stringify(payload));
      const messageId = await topicRef.publishMessage({ data: messageBuffer });
      console.log(`Message ${messageId} published to topic ${topic}`);
      return messageId;
    } catch (error) {
      console.error(`Error publishing to topic ${topic}:`, error);
      throw error;
    }
  }
}

module.exports = aiPubsubAdapter;
