// aiService.js
/* eslint-disable no-unused-vars */
'use strict';

const IAIService = require('./interfaces/IAIService');
const AIResponse = require('../../domain/entities/aiResponse');

// const pubsubTopics = require('../../../messaging/pubsub/aiPubsubTopics');

class aiService extends IAIService{

  constructor(aiAIAdapter, aiPersistAdapter, aiMessagingAdapter, aiGitAdapter, aiWikiAdapter) {
    super();
    this.aiAIAdapter = aiAIAdapter;
    this.aiPersistAdapter = aiPersistAdapter;
    this.aiMessagingAdapter = aiMessagingAdapter;
    this.aiGitAdapter = aiGitAdapter;
    this.aiWikiAdapter = aiWikiAdapter;
  }

  async respondToPrompt(userId, conversationId, prompt, repoId) {
    const preFetchedRepo = await this.aiGitAdapter.fetchRepository(userId, repoId);
    const preFetchedWiki = await this.aiWikiAdapter.fetchWiki(userId, repoId);
    const aiResponse = new AIResponse(userId);
    const response = await aiResponse.respondToPrompt(conversationId, prompt, userId, repoId, this.aiAIAdapter);
    return response;
  }
}

module.exports = aiService;
