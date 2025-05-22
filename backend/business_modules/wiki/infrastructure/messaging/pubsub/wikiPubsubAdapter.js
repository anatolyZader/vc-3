// wikiPubsubAdapter.js
'use strict';

const IWikiMessagingPort = require('./../../../domain/ports/IWikiMessagingPort');

class WikiPubsubAdapter extends IWikiMessagingPort {
  // Inject the pubSubClient into the constructor
  constructor({ pubSubClient }) {
    super(); // Calling super() because it explicitly extends IWikiMessagingPort
    // Store the injected Pub/Sub client instance
    this.pubSubClient = pubSubClient;

    // Use environment variables for topic names for better flexibility
    this.topicName = process.env.PUBSUB_WIKI_TOPIC_NAME || 'wiki-events';
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

  // Specific methods for publishing different wiki-related events
  async fetchPage(pageId) {
    return this.publishEvent('fetchWikiPage', { pageId });
  }

  async createPage(pageTitle) {
    return this.publishEvent('createWikiPage', { title: pageTitle });
  }

  async updatePage(pageId, newContent) {
    return this.publishEvent('updateWikiPage', { pageId, content: newContent });
  }

  async deletePage(pageId) {
    return this.publishEvent('deleteWikiPage', { pageId });
  }
}

module.exports = WikiPubsubAdapter;