// aiPubsubAdapter.js
'use strict';

class AIPubsubAdapter {
  constructor({ pubSubClient }) {
    this.pubSubClient = pubSubClient;
    this.aiTopic = 'ai-topic';
    this.gitTopic = 'git-topic';
    this.gitSubscription = 'git-sub'; 
    this.gitSubscriptionRef = pubSubClient.subscription(this.gitSubscription);
  }

  async publishAiResponse(event, payload) {
    try {
      const topicRef = this.pubSubClient.topic(this.aiTopic);

      // Construct the full message object with event type and payload
      const message = {
        event: event,
        payload: payload
      };

      const messageBuffer = Buffer.from(JSON.stringify(message));
      const messageId = await topicRef.publishMessage({ data: messageBuffer });

      console.log(`AI Event '${event}' published with Message ID: ${messageId} to topic: ${this.aiTopic}`);
      // Log specific payload details for 'questionAdded' to maintain visibility
      if (event === 'questionAdded' && payload.conversationId && payload.prompt) {
        console.log(`  - Conversation: ${payload.conversationId}, Prompt: "${payload.prompt.substring(0, 50)}..."`);
      } else if (event === 'aiResponse' && payload.conversationId) {
        console.log(`  - Conversation: ${payload.conversationId}, Response status: ${payload.success ? 'success' : 'failure'}`);
      }
      return messageId;
    } catch (error) {
      console.error(`Error publishing AI event '${event}':`, error);
      throw error;
    }
  }
}

module.exports = AIPubsubAdapter;
