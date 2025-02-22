// infrastructure/messaging/pubsub/chatPubsubAdapter.js
'use strict';

const pubSubClient = require('../../../../../aop/messaging/pubsub/pubsubClient');
const topic = 'chat';

const publish = async (topic, prompt) => {
  try {
    // Get a reference to the topic. The topic name should match the one defined in GCP.
    const topicRef = pubSubClient.topic(topic);
    const messageBuffer = Buffer.from(JSON.stringify(prompt));
    const messageId = await topicRef.publishMessage({ data: messageBuffer });
    console.log(`Message ${messageId} published to topic ${topic}`);
    return messageId;
  } catch (error) {
    console.error(`Error publishing to topic ${topic}:`, error);
    throw error;
  }
}

class ChatPubsubAdapter {

    async sendQuestion(question) {
        try {
          publish(topic, question.prompt);
        } catch (error) {
          console.error(`Error publishing to topic ${topic}:`, error);
          throw error;
        }
      }






}

module.exports = ChatPubsubAdapter;
