// gitPubsubAdapter.js
'use strict';

const pubSubClient = require('../../../../../aop_modules/messaging/pubsub/pubsubClient');
const topic = 'git';


const publish = async (topic, prompt) => {
  try {
    // Get a reference to the topic from GCP
    const topicRef = pubSubClient.topic(topic);
    const messageBuffer = Buffer.from(JSON.stringify(prompt));
    const messageId = await topicRef.publishMessage({ data: messageBuffer });
    console.log(`Message ${messageId} published to topic ${topic}`);
    return messageId;
  } catch (error) {
    console.error(`Error publishing to topic ${topic}:`, error);
    throw error;
  }
};

class GitPubsubAdapter {

  async addQuestion(prompt) {
    try {
      const messageId = await publish(topic, prompt);
      return messageId;
    } catch (error) {
      console.error(`Error publishing to topic ${topic}:`, error);
      throw error;
    }
  }

  async analyzeRepo(prompt) {
    try {
      const messageId = await publish(topic, prompt);
      return messageId;
    } catch (error) {
      console.error(`Error publishing analysis event to topic ${topic}:`, error);
      throw error;
    }
  }

}

module.exports = GitPubsubAdapter;
