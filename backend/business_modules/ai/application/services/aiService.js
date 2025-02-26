// aiService.js
/* eslint-disable no-unused-vars */
'use strict';

const AIResponse = require('../../domain/entities/aiResponse');

// const pubsubTopics = require('../../../messaging/pubsub/aiPubsubTopics');

class aiService {

  constructor(aiPersistAdapter, aiMessagingAdapter) {
    this.aiPersistAdapter = aiPersistAdapter;
    this.aiMessagingAdapter = aiMessagingAdapter;
  }

  async startConversation(userId) {
    const aiResponse = new AIResponse(userId);
    await aiResponse.startConversation(this.aiPersistAdapter);

    // // Publish the AI conversation started event.
    // await this.aiMessagingAdapter.publish(pubsubTopics.AI_CONVERSATION_STARTED, {
    //   conversationId: aiResponse.conversationId,
    //   userId,
    // });

    return aiResponse.conversationId;
  }

  async respondToPrompt(userId, prompt) {
    const aiResponse = new AIResponse(userId);
    const response = await aiResponse.respondToPrompt(prompt, this.aiPersistAdapter);

    // Publish the AI prompt responded event.
    // await this.aiMessagingAdapter.publish(pubsubTopics.AI_PROMPT_RESPONDED, {
    //   conversationId: aiResponse.conversationId,
    //   userId,
    //   prompt,
    //   response,
    // });

    return response;
  }
}

module.exports = aiService;
