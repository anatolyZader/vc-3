// aiPubsubAdapter.js
'use strict';

const { getChannelName } = require('../../../../../messageChannels');

class AIPubsubAdapter {
  constructor({ transport, logger }) {
    this.transport = transport;
    this.log = logger;
    this.aiTopic = getChannelName('ai');
  }

  async publishAiResponse(event, payload) {
    try {
      // Construct proper envelope: { event, payload, timestamp, source }
      const envelope = {
        event,
        payload, // Proper payload wrapping
        timestamp: new Date().toISOString(),
        source: 'ai-module'
      };

      // Use generic transport - works with both Redis and GCP Pub/Sub
      const messageId = await this.transport.publish(this.aiTopic, envelope);
      
      this.log.info({ event, messageId, topic: this.aiTopic }, 'AI event published');
      return messageId;
    } catch (error) {
      this.log.error({ event, error }, 'Error publishing AI event');
      throw error;
    }
  }
}


module.exports = AIPubsubAdapter;
