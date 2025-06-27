// aiPubsubAdapter.js
'use strict';

class AIPubsubAdapter {
  constructor({ pubSubClient }) {
    this.pubSubClient = pubSubClient;
    this.aiTopic = 'ai-topic';
    this.gitTopic = 'git-topic';
    this.wikiTopic = 'wiki-topic';
    this.gitSubscription = 'git-sub';
    this.wikiSubscription = 'wiki-sub';
    this.gitSubscriptionRef = pubSubClient.subscription(this.gitSubscription);
    this.wikiSubscriptionRef = pubSubClient.subscription(this.wikiSubscription);
  }


  async publishAiResponse(response) {
    try {
      const topicRef = this.pubSubClient.topic(this.aiTopic);
      const messageBuffer = Buffer.from(JSON.stringify(response));
      const messageId = await topicRef.publishMessage({ data: messageBuffer });
      console.log(`AI Response published with Message ID: ${messageId} to topic: ${this.aiTopic}`);
      return messageId;
    } catch (error) {
      console.error(`Error publishing AI response:`, error);
      throw error;
    }
  }

  async respondToPrompt(userId, conversationId, prompt) {
    try {
      const topicRef = this.pubSubClient.topic(this.aiTopic);

      const message = {
        event: 'questionAdded',
        payload: {
          userId,
          conversationId,
          prompt
        }
      };

      const messageBuffer = Buffer.from(JSON.stringify(message));
      const messageId = await topicRef.publishMessage({ data: messageBuffer });

      console.log(`AI prompt published with Message ID: ${messageId} for conversation: ${conversationId}`);
      return messageId;
    } catch (error) {
      console.error(`Error publishing respondToPrompt:`, error);
      throw error;
    }
  }
  
}

module.exports = AIPubsubAdapter;