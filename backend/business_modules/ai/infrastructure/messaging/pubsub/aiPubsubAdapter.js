// aiPubsubAdapter.js
'use strict';

class AIPubsubAdapter {
  constructor({ pubSubClient }) {
    this.pubSubClient = pubSubClient;
    this.aiTopic = 'ai-topic';
  }

async publishAiResponse(event, payload) {
  try {
    const topicRef = this.pubSubClient.topic(this.aiTopic);
    
    // Construct the full message object with event type and payload
    const message = {
      event: event,
      ...payload  // ✅ Spread payload directly, not nested under 'payload'
    };

    const messageBuffer = Buffer.from(JSON.stringify(message));
    const messageId = await topicRef.publishMessage({ data: messageBuffer });
    
    console.log(`AI Event '${event}' published with Message ID: ${messageId} to topic: ${this.aiTopic}`);
    return messageId;
  } catch (error) {
    console.error(`Error publishing AI event '${event}':`, error);
    throw error;
  }
}};


module.exports = AIPubsubAdapter;
