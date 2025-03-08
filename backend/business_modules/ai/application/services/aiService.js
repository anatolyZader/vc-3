// aiService.js
/* eslint-disable no-unused-vars */
'use strict';

const IAIService = require('./interfaces/IAIService');
const AIResponse = require('../../domain/entities/aiResponse');

// const pubsubTopics = require('../../../messaging/pubsub/aiPubsubTopics');

class AIService extends IAIService{

  constructor(aiAIAdapter, aiPersistAdapter, aiMessagingAdapter, aiGitAdapter, aiWikiAdapter) {
    super();
    this.aiAIAdapter = aiAIAdapter;
    this.aiPersistAdapter = aiPersistAdapter;
    this.aiMessagingAdapter = aiMessagingAdapter;
    this.aiGitAdapter = aiGitAdapter;
    this.aiWikiAdapter = aiWikiAdapter;
  }

  async respondToPrompt(userId, conversationId,repoId, prompt) {
    const preFetchedRepo = await this.aiGitAdapter.fetchRepo(userId, repoId);
    const preFetchedWiki = await this.aiWikiAdapter.fetchWiki(userId, repoId);
    const aiResponse = new AIResponse(userId);
    const response = await aiResponse.respondToPrompt(conversationId, prompt, preFetchedRepo, preFetchedWiki, this.aiAIAdapter);
    return response;
  }
}

module.exports = AIService;
