// infrastructure/messaging/pubsub/chatPubsubAdapter.js

'use strict';

const pubSubClient = require('../../../../../aop_modules/messaging/pubsub/pubsubClient');
const topic = 'chat';

const publish = async (topic, payload) => {
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
};

class ChatPubsubAdapter {
  async conversationStarted(payload) {
    try {
      return await publish(topic, payload);
    } catch (error) {
      console.error(`Error publishing conversationStarted event to topic ${topic}:`, error);
      throw error;
    }
  }

  async conversationRenamed(payload) {
    try {
      return await publish(topic, payload);
    } catch (error) {
      console.error(`Error publishing conversationRenamed event to topic ${topic}:`, error);
      throw error;
    }
  }

  async conversationDeleted(payload) {
    try {
      return await publish(topic, payload);
    } catch (error) {
      console.error(`Error publishing conversationDeleted event to topic ${topic}:`, error);
      throw error;
    }
  }

  async sendQuestion(payload) {
    try {
      return await publish(topic, payload);
    } catch (error) {
      console.error(`Error publishing questionSent event to topic ${topic}:`, error);
      throw error;
    }
  }

  async sendAnswer(payload) {
    try {
      return await publish(topic, payload);
    } catch (error) {
      console.error(`Error publishing answerSent event to topic ${topic}:`, error);
      throw error;
    }
  }
}

module.exports = ChatPubsubAdapter;
