// aiPubsubAdapter.js
'use strict';



class AIPubsubAdapter {
  constructor({ pubSubClient }) {
    // super(); // Uncomment this ONLY if AIPubsubAdapter extends another class
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

  async requestRepoData(userId, repoId, correlationId) {
    try {
      const topicRef = this.pubSubClient.topic(this.gitTopic);
      const message = {
        action: 'fetchRepo',
        payload: { userId, repoId, correlationId },
      };
      const messageBuffer = Buffer.from(JSON.stringify(message));
      const messageId = await topicRef.publishMessage({ data: messageBuffer });
      console.log(`Requested Git data with Message ID: ${messageId} to topic: ${this.gitTopic}`);
      return messageId;
    } catch (error) {
      console.error(`Error requesting Git data:`, error);
      throw error;
    }
  }

  async requestWikiData(userId, repoId, correlationId) {
    try {
      const topicRef = this.pubSubClient.topic(this.wikiTopic);
      const message = {
        action: 'fetchWiki',
        payload: { userId, repoId, correlationId },
      };
      const messageBuffer = Buffer.from(JSON.stringify(message));
      const messageId = await topicRef.publishMessage({ data: messageBuffer });
      console.log(`Requested Wiki data with Message ID: ${messageId} to topic: ${this.wikiTopic}`);
      return messageId;
    } catch (error) {
      console.error(`Error requesting Wiki data:`, error);
      throw error;
    }
  }

  listenForRepoResponses(aiService) {
    const messageHandler = async (message) => {
      try {
        const data = JSON.parse(message.data.toString());
        console.log(`Received Git Response:`, data);
        if (data.event === 'repositoryFetched') {
          await aiService.handleRepoResponse(data.repoData, data.correlationId);
        }
        message.ack();
      } catch (error) {
        console.error(`Error processing Git response:`, error);
        message.nack();
      }
    };
    this.gitSubscriptionRef.on('message', messageHandler);
    console.log(`Listening for Git responses on subscription: ${this.gitSubscription}...`);
  }

  listenForWikiResponses(aiService) {
    const messageHandler = async (message) => {
      try {
        const data = JSON.parse(message.data.toString());
        console.log(`Received Wiki Response:`, data);
        if (data.event === 'wikiFetched') {
          await aiService.handleWikiResponse(data.wikiData, data.correlationId);
        }
        message.ack();
      } catch (error) {
        console.error(`Error processing Wiki response:`, error);
        message.nack();
      }
    };
    this.wikiSubscriptionRef.on('message', messageHandler);
    console.log(`Listening for Wiki responses on subscription: ${this.wikiSubscription}...`);
  }
}

module.exports = AIPubsubAdapter;