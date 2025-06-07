// wikiPubsubAdapter.js
'use strict';

const IWikiMessagingPort = require('../../../domain/ports/IWikiMessagingPort');

class WikiPubsubAdapter extends IWikiMessagingPort {
  constructor({ pubSubClient }) {
    this.pubSubClient = pubSubClient;
    this.topicName = 'wiki';
  }

  async publishfetchedWikiEvent(fetchedWiki) {
    const event = {
    event: 'wikiFetched',
    payload: { ...fetchedWiki }
    };

    const dataBuffer = Buffer.from(JSON.stringify(event));
    try {
      const [topic] = await this.pubSubClient
        .topic(this.topicName)
        .get({ autoCreate: true });
      const messageId = await topic.publishMessage({ data: dataBuffer });
      console.log(`Published 'wikiFetched' event with message ID: ${messageId} to topic: ${this.topicName}`);
      return messageId;
    } catch (error) {
      console.error(`Error publishing 'wikiFetched' event to topic ${this.topicName}:`, error);
      throw error;
    }
  }
}

module.exports = WikiPubsubAdapter;