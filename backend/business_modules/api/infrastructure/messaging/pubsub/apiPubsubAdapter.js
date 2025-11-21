// apiPubsubAdapter.js
'use strict';

const { getChannelName } = require('../../../../../messageChannels');

class ApiPubsubAdapter {
  constructor({ transport, logger }) {
    this.transport = transport;
    this.log = logger;
    this.topicName = getChannelName('api');
  }

  async publishHttpApiFetchedEvent(result, correlationId) { 
    const envelope = {
      event: 'httpApiFetched',
      payload: { ...result, correlationId },
      timestamp: new Date().toISOString(),
      source: 'api-module'
    };

    try {
      const messageId = await this.transport.publish(this.topicName, envelope);
      this.log.info({ messageId, correlationId, topic: this.topicName }, 'Published httpApiFetched event');
      return messageId;
    } catch (error) {
      this.log.error({ error, correlationId, topic: this.topicName }, 'Error publishing httpApiFetched event');
      throw error;
    }
  }
}

module.exports = ApiPubsubAdapter;