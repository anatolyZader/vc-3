// infrastructure/messaging/pubsub/chatPubsubAdapter.js
'use strict';
const IChatMessagingPort = require('../../../domain/ports/IChatMessagingPort'); 

class ChatPubsubAdapter  extends IChatMessagingPort  {
  constructor({ pubSubClient }) {
    super();
    this.pubSubClient = pubSubClient;
    // It's good practice to use environment variables for topic names
    this.topicName = process.env.PUBSUB_CHAT_TOPIC_NAME || 'chat-events'; // Using a more descriptive name
  }

  // Generic method to publish an event
  async publishEvent(eventName, payload) {
    const event = { event: eventName, ...payload };
    const dataBuffer = Buffer.from(JSON.stringify(event));
    try {
      const topic = this.pubSubClient.topic(this.topicName);
      const messageId = await topic.publishMessage({ data: dataBuffer });
      console.log(`Published ${eventName} event with message ID: ${messageId} to topic: ${this.topicName}`);
      return messageId;
    } catch (error) {
      console.error(`Error publishing ${eventName} event to topic ${this.topicName}:`, error);
      throw error;
    }
  }

  // Specific methods for publishing different chat-related events
  async startConversation(payload) {
    return this.publishEvent('conversationStarted', payload);
  }

  async addQuestion(payload) {
    return this.publishEvent('questionAdded', payload); 
  }

  async addAnswer(payload) {
    return this.publishEvent('answerAdded', payload); 
  }

  async renameConversation(payload) {
    return this.publishEvent('conversationRenamed', payload);
  }

  async deleteConversation(payload) {
    return this.publishEvent('conversationDeleted', payload);
  }
}

module.exports = ChatPubsubAdapter;