// gitPubsubAdapter.js
'use strict';

const pubSubClient = require('../../../../../aop_modules/messaging/pubsub/pubsubClient');

class GitPubsubAdapter {
  constructor() {
    this.topicName = 'git-topic'; 
  }

  async publishRepoFetchedEvent(result) {
    const event = {
      event: 'repositoryFetched',
      ...result
    };
    const dataBuffer = Buffer.from(JSON.stringify(event));
    try {
      const topic = pubSubClient.topic(this.topicName);
      const messageId = await topic.publishMessage({ data: dataBuffer });
      console.log(`Published git event with message ID: ${messageId}`);
      return messageId;
    } catch (error) {
      console.error('Error publishing git event:', error);
      throw error;
    }
  }

  async publishWikiFetchedEvent(result, correlationId) {
    const event = {
      event: 'wikiFetched',
      correlationId,
      ...result
    };
    const dataBuffer = Buffer.from(JSON.stringify(event));
    try {
      const topic = pubSubClient.topic(this.topicName);
      const messageId = await topic.publishMessage({ data: dataBuffer });
      console.log(`Published git wiki event with message ID: ${messageId}`);
      return messageId;
    } catch (error) {
      console.error('Error publishing git wiki event:', error);
      throw error;
    }
  }
}

module.exports = GitPubsubAdapter;
