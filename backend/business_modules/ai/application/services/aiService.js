'use strict';

const IAIService = require('./interfaces/IAIService');
const { v4: uuidv4 } = require('uuid');

class AIService extends IAIService {
  constructor({aiAIAdapter, aiPersistAdapter, aiMessagingAdapter}) {
    super();
    this.aiAIAdapter = aiAIAdapter;
    this.aiPersistAdapter = aiPersistAdapter;
    this.aiMessagingAdapter = aiMessagingAdapter;

    // In-memory store to track responses. Architecturally, this Map is the simplest way to correlate asynchronous callbacks from the Git/Wiki modules (which may arrive in any order) with the original prompt. serves as the single source of truth for all state related to this particular prompt request.
    this.pendingRequests = new Map();
  }

  async respondToPrompt(userId, conversationId, repoId, prompt) {
    const correlationId = uuidv4(); // Later, when Git/Wiki modules publish their data, they must include this same ID so we know which in-flight request to update.

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

    return new Promise((resolve, reject) => { //Wraps the rest of the logic in a Promise that won’t resolve until the AI response is ready (or times out). Externally, any caller of respondToPrompt(...) gets a promise that settles with the AI’s generated answer or rejects on timeout.
      const checkResponses = async () => {
        const pending = this.pendingRequests.get(correlationId);
        if (pending && pending.repoData && pending.wikiData && !pending.resolved) {
          pending.resolved = true;
          this.pendingRequests.delete(correlationId);
           clearInterval(interval); 

          // Generate AI response
        
          const aiResponse = await this.aiAIAdapter.respondToPrompt(
            conversationId,
            prompt,
            pending.repoData,
            pending.wikiData,         
          );

          // Persist AI response
          try { 
            await this.aiPersistAdapter.saveAiResponse({
              userId,
              conversationId,
              repoId,
              prompt,
              aiResponse,
            });
            console.log(`AI response persisted for conversation ${conversationId}`);
          } catch (error) {
            console.error('Error persisting AI response:', error);
          }

          // Publish the AI response
          this.aiMessagingAdapter.publishAiResponse(aiResponse);

          resolve(raiResponse);
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
      const pendingRequest = this.pendingRequests.get(correlationId);
      pendingRequest.repoData = repoData;

      // Persist Git data before proceeding
      try {
        await this.aiPersistAdapter.saveGitData(pendingRequest.userId, pendingRequest.repoId, repoData);
        console.log(`Persisted Git data for repo ${pendingRequest.repoId}`);
      } catch (error) {
        console.error('Error persisting Git data:', error);
      }
    }
  }
  
  async handleWikiResponse(wikiData, correlationId) {
    if (this.pendingRequests.has(correlationId)) {
      const pendingRequest = this.pendingRequests.get(correlationId);
      pendingRequest.wikiData = wikiData;

      // Persist Wiki data before proceeding
      try {
        await this.aiPersistAdapter.saveWikiData(pendingRequest.userId, pendingRequest.repoId, wikiData);
        console.log(`Persisted Wiki data for repo ${pendingRequest.repoId}`);
      } catch (error) {
        console.error('Error persisting Wiki data:', error);
      }
    }
  }
}

module.exports = AIService;
