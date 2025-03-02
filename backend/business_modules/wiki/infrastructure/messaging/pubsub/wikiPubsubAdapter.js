'use strict';

const pubSubClient = require('../../../../../aop_modules/messaging/pubsub/pubsubClient');

class WikiPubsubAdapter {
  async publish(topic, payload) {
    try {
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

  async analyzePage(payload) {
    const topic = 'wiki'; // using the wiki topic for analysis events
    return this.publish(topic, payload);
  }
}

module.exports = WikiPubsubAdapter;
