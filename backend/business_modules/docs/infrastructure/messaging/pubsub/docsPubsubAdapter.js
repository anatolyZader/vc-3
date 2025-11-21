// docsPubsubAdapter.js
'use strict';

const IDocsMessagingPort = require('../../../domain/ports/IDocsMessagingPort');
const { getChannelName } = require('../../../../../messageChannels');

class DocsPubsubAdapter extends IDocsMessagingPort {
  constructor({ transport, logger }) {
    super();
    this.transport = transport;
    this.log = logger;
    this.topicName = getChannelName('docs');
  }

  async publishfetchedDocsEvent(fetchedDocs) {
    const envelope = {
      event: 'docsFetched',
      payload: { ...fetchedDocs },
      timestamp: new Date().toISOString(),
      source: 'docs-module'
    };

    try {
      const messageId = await this.transport.publish(this.topicName, envelope);
      this.log.info({ messageId, topic: this.topicName }, 'Published docsFetched event');
      return messageId;
    } catch (error) {
      this.log.error({ error, topic: this.topicName }, 'Error publishing docsFetched event');
      throw error;
    }
  }
}

module.exports = DocsPubsubAdapter;