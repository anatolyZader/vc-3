// gitPubsubAdapter.js
'use strict';

// If this class extends a base class or implements an interface (e.g., IGitMessagingPort),
// include 'extends YourInterfaceName' after GitPubsubAdapter.
class GitPubsubAdapter /* extends IGitMessagingPort */ {
  // Inject the pubSubClient into the constructor
  constructor({ pubSubClient }) {
    // IMPORTANT: If 'GitPubsubAdapter' extends another class,
    // 'super()' MUST be the very first line here.
    // If it does NOT extend any class, then 'super()' should be removed.
    // super(); // Uncomment this ONLY if GitPubsubAdapter extends another class

    // Store the injected Pub/Sub client instance
    this.pubSubClient = pubSubClient;

    // Use environment variables for topic names for better flexibility
    this.topicName = process.env.PUBSUB_GIT_EVENTS_TOPIC_NAME || 'git-events-topic';
  }

  async publishRepoFetchedEvent(result) {
    const event = {
      event: 'repositoryFetched',
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