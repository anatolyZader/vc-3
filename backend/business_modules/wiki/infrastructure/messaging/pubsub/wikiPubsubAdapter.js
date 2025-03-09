'use strict';

const pubSubClient = require('../../../aop_modules/messaging/pubsub/pubsubClient');

class WikiPubsubAdapter {
  constructor() {
    this.topicName = 'wiki-topic'; // dedicated topic for wiki events
  }

  async publishEvent(eventPayload) {
    // Build event object including an event name.
    const event = {
      event: 'wikiEvent',
      ...eventPayload
    };
    const dataBuffer = Buffer.from(JSON.stringify(event));
    try {
      const topic = pubSubClient.topic(this.topicName);
      // Use the new publishMessage signature
      const messageId = await topic.publishMessage({
        data: dataBuffer
      });
      console.log(`Published wiki event with message ID: ${messageId}`);
      return messageId;
    } catch (error) {
      console.error('Error publishing wiki event:', error);
      throw error;
    }
  }
}

module.exports = WikiPubsubAdapter;
