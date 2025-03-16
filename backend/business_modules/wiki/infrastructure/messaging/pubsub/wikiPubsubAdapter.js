// wikiPubsubAdapter.js
'use strict';

const pubSubClient = require('../../../../../aop_modules/messaging/pubsub/pubsubClient');
const IWikiMessagingPort = require('./../../../domain/ports/IWikiMessagingPort');

class WikiPubsubAdapter extends IWikiMessagingPort {
  constructor() {
    super();
    this.topicName = 'wiki'; 
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
