// infrastructure/messaging/pubsub/chatPubsubAdapter.js
'use strict';

const pubSubClient = require('../../../../../aop_modules/messaging/pubsub/pubsubClient');

class ChatPubsubAdapter {
  constructor() {
    this.topicName = 'chat'; // Dedicated topic for chat events
  }

  async publishEvent(eventName, payload) {
    const event = { event: eventName, ...payload };
    const dataBuffer = Buffer.from(JSON.stringify(event));
    try {
      const topic = pubSubClient.topic(this.topicName);
      const messageId = await topic.publishMessage({ data: dataBuffer });
      console.log(`Published ${eventName} event with message ID: ${messageId}`);
      return messageId;
    } catch (error) {
      console.error(`Error publishing ${eventName} event:`, error);
      throw error;
    }
  }

  async startConversation(payload) {
    return this.publishEvent('conversationStarted', payload);
  }

  async addQuestion(payload) {
    return this.publishEvent('questionSent', payload);
  }

  async addAnswer(payload) {
    return this.publishEvent('answerSent', payload);
  }

  async renameConversation(payload) {
    return this.publishEvent('conversationRenamed', payload);
  }

  async deleteConversation(payload) {
    return this.publishEvent('conversationDeleted', payload);
  }
}

module.exports = ChatPubsubAdapter;
