// aiService.js
/* eslint-disable no-unused-vars */
'use strict';

const IAIService = require('./interfaces/IAIService');
const AIResponse = require('../../domain/entities/aiResponse');

// const pubsubTopics = require('../../../messaging/pubsub/aiPubsubTopics');

class aiService extends IAIService{

  constructor(aiAIAdapter, aiPersistAdapter, aiMessagingAdapter) {
    super();
    this.aiAIAdapter = aiAIAdapter;
    this.aiPersistAdapter = aiPersistAdapter;
    this.aiMessagingAdapter = aiMessagingAdapter;
  }

  async respondToPrompt(userId, conversationId, prompt) {
    const aiResponse = new AIResponse(userId);
    const response = await aiResponse.respondToPrompt(conversationId, prompt, this.aiAIAdapter);

    return response;
  }
}

module.exports = aiService;
