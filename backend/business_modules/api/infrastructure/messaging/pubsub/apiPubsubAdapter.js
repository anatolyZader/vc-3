// apiPubsubAdapter.js
'use strict';

class ApiPubsubAdapter {
  constructor({ pubSubClient }) {
    this.pubSubClient = pubSubClient;
    this.topicName = 'git';
  }

  async publishHttpApiFetchedEvent(result, correlationId) { 
    const event = {
      event: 'httpApiFetched',
      payload: { ...result, correlationId } 
    };

    const dataBuffer = Buffer.from(JSON.stringify(event));
    try {
      const [topic] = await this.pubSubClient
        .topic(this.topicName)
        .get({ autoCreate: true });
      const messageId = await topic.publishMessage({ data: dataBuffer });
      console.log(`Published 'httpApiFetched' event with message ID: ${messageId} to topic: ${this.topicName}`);
      return messageId;
    } catch (error) {
      console.error(`Error publishing 'httpApiFetched' event to topic ${this.topicName}:`, error);
      throw error;
    }
  }
}

module.exports = ApiPubsubAdapter;