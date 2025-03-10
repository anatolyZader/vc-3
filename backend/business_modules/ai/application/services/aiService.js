// aiService.js
//* eslint-disable no-unused-vars */
'use strict';

const IAIService = require('./interfaces/IAIService');
const AIResponse = require('../../domain/entities/aiResponse');
const { v4: uuidv4 } = require('uuid');

class AIService extends IAIService {
  constructor(aiAIAdapter, aiPersistAdapter, aiMessagingAdapter) {
    super();
    this.aiAIAdapter = aiAIAdapter;
    this.aiPersistAdapter = aiPersistAdapter;
    this.aiMessagingAdapter = aiMessagingAdapter;

    // In-memory store to track responses
    this.pendingRequests = new Map();
  }

  async respondToPrompt(userId, conversationId, repoId, prompt) {
    const correlationId = uuidv4();

    // Store the pending request
    this.pendingRequests.set(correlationId, {
      userId,
      conversationId,
      repoId,
      prompt,
      repoData: null,
      wikiData: null,
      resolved: false,
    });

    // Publish fetch requests to Git & Wiki modules
    await this.aiMessagingAdapter.requestRepoData(userId, repoId, correlationId);
    await this.aiMessagingAdapter.requestWikiData(userId, repoId, correlationId);

    return new Promise((resolve, reject) => {
      const checkResponses = () => {
        const pending = this.pendingRequests.get(correlationId);
        if (pending && pending.repoData && pending.wikiData && !pending.resolved) {
          pending.resolved = true;
          this.pendingRequests.delete(correlationId);
          const aiResponse = new AIResponse(userId);
          const response = aiResponse.respondToPrompt(
            conversationId,
            prompt,
            pending.repoData,
            pending.wikiData,
            this.aiAIAdapter
          );

          // Persist AI response
          this.aiPersistAdapter.saveAiResponse(response);

          // Publish the AI response
          this.aiMessagingAdapter.publishAiResponse(response);

          resolve(response);
        }
      };

      // Periodically check if both responses are available
      const interval = setInterval(() => {
        if (!this.pendingRequests.has(correlationId)) {
          clearInterval(interval);
        } else {
          checkResponses();
        }
      }, 500);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(correlationId)) {
          this.pendingRequests.delete(correlationId);
          reject(new Error('Timeout waiting for repo and wiki responses'));
        }
      }, 30000);
    });
  }

  // Handles incoming repositoryFetched events from Git Module
  async handleRepoResponse(repoData, correlationId) {
    if (this.pendingRequests.has(correlationId)) {
      this.pendingRequests.get(correlationId).repoData = repoData;
    }
  }

  // Handles incoming wikiFetched events from Wiki Module
  async handleWikiResponse(wikiData, correlationId) {
    if (this.pendingRequests.has(correlationId)) {
      this.pendingRequests.get(correlationId).wikiData = wikiData;
    }
  }
}

module.exports = AIService;
