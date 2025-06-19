// gitPubsubAdapter.js
'use strict';

class GitPubsubAdapter {
  constructor({ pubSubClient }) {
    this.pubSubClient = pubSubClient;
    this.topicName = process.env.PUBSUB_GIT_EVENTS_TOPIC_NAME || 'git-events-topic';
  }

  async publishRepoFetchedEvent(result, correlationId) {
    const event = {
      event: 'repositoryFetched',
      correlationId, // Include correlationId directly in the event payload
      ...result
    };
    const dataBuffer = Buffer.from(JSON.stringify(event));
    try {
      // Use the injected client instance to get the topic
      const topic = this.pubSubClient.topic(this.topicName);
      const messageId = await topic.publishMessage({ data: dataBuffer });
      console.log(`Published 'repositoryFetched' event with message ID: ${messageId} to topic: ${this.topicName}`);
      return messageId;
    } catch (error) {
      console.error(`Error publishing 'repositoryFetched' event to topic ${this.topicName}:`, error);
      throw error;
    }
  }

  async publishWikiFetchedEvent(result, correlationId) {
    const event = {
      event: 'wikiFetched',
      correlationId, // Include correlationId directly in the event payload
      ...result
    };
    const dataBuffer = Buffer.from(JSON.stringify(event));
    try {
      // Use the injected client instance to get the topic
      const topic = this.pubSubClient.topic(this.topicName);
      const messageId = await topic.publishMessage({ data: dataBuffer });
      console.log(`Published 'wikiFetched' event with message ID: ${messageId} to topic: ${this.topicName}`);
      return messageId;
    } catch (error) {
      console.error(`Error publishing 'wikiFetched' event to topic ${this.topicName}:`, error);
      throw error;
    }
  }
}

module.exports = GitPubsubAdapter;