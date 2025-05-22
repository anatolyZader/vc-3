// infrastructure/messaging/pubsub/chatPubsubAdapter.js
'use strict';

// If this class extends a base class or implements an interface (e.g., IChatMessagingPort),
// include 'extends YourInterfaceName' after ChatPubsubAdapter.
class ChatPubsubAdapter /* extends IChatMessagingPort */ {
  // Inject the pubSubClient into the constructor
  constructor({ pubSubClient }) {
    // IMPORTANT: If 'ChatPubsubAdapter' extends another class,
    // 'super()' MUST be the very first line here.
    // If it does NOT extend any class, then 'super()' should be removed.
    // super(); // Uncomment this ONLY if ChatPubsubAdapter extends another class

    // Store the injected Pub/Sub client instance
    this.pubSubClient = pubSubClient;

    // It's good practice to use environment variables for topic names
    this.topicName = process.env.PUBSUB_CHAT_TOPIC_NAME || 'chat-events'; // Using a more descriptive name
  }

  // Generic method to publish an event
  async publishEvent(eventName, payload) {
    const event = { event: eventName, ...payload };
    const dataBuffer = Buffer.from(JSON.stringify(event));
    try {
      // Use the injected client instance to get the topic
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
    return this.publishEvent('questionAdded', payload); // Changed from 'questionSent' for consistency
  }

  async addAnswer(payload) {
    return this.publishEvent('answerAdded', payload); // Changed from 'answerSent' for consistency
  }

  async renameConversation(payload) {
    return this.publishEvent('conversationRenamed', payload);
  }

  async deleteConversation(payload) {
    return this.publishEvent('conversationDeleted', payload);
  }
}

module.exports = ChatPubsubAdapter;