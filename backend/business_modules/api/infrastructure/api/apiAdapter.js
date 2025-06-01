// apiAdapter.js
'use strict';

const IApiPort = require('../../domain/ports/IApiPort');

class ApiAdapter extends IApiPort {
  constructor() {
    super();
  }

  async publishHttpApiFetchedEvent(result) {
    const event = {
    event: 'httpApiFetched',
    payload: { ...result }
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

module.exports = ApiAdapter;