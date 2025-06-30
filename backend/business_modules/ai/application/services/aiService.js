/* eslint-disable no-unused-vars */
'use strict';

const IAIService = require('./interfaces/IAIService');
const AIResponse = require('../../domain/entities/aiResponse');
const PushedRepo = require('../../domain/entities/pushedRepo');

class AIService extends IAIService {
  constructor({ aiAdapter, aiPersistAdapter, aiMessagingAdapter }) {
    super();
    this.aiAdapter = aiAdapter;
    this.aiPersistAdapter = aiPersistAdapter;
    this.aiMessagingAdapter = aiMessagingAdapter;
  }

  async respondToPrompt(userId, conversationId, prompt) {
    try {
      console.log(`[2025-06-25 08:39:05] Processing prompt for user ${userId}, conversation ${conversationId}`);
      const aiResponse = new AIResponse(userId);
      const response = await aiResponse.respondToPrompt(conversationId, prompt, this.aiAdapter);
      // Persist AI response
      try {
        await this.aiPersistAdapter.saveAiResponse({
          userId,
          conversationId,
          response: response.response || response,
        });
        console.log(`[2025-06-25 08:39:05] AI response persisted for conversation ${conversationId}`);
      } catch (error) {
        console.error('[2025-06-25 08:39:05] Error persisting AI response:', error);
      }
      // Publish the AI response back to chat module
      await this.aiMessagingAdapter.publishAiResponse({
        event: 'answerAdded',
        payload: {
          userId,
          conversationId,
          response: response.response || response
        }
      });
      console.log(`[2025-06-25 08:39:05] AI response published for user ${userId}`);
      return response;
    } catch (error) {
      console.error(`[2025-06-25 08:39:05] Error in respondToPrompt:`, error);
      // Publish error back to chat module
      try {
        await this.aiMessagingAdapter.publishAiResponse({
          event: 'aiResponseError',
          payload: {
            userId,
            conversationId,
            error: error.message
          }
        });
      } catch (publishError) {
        console.error('[2025-06-25 08:39:05] Error publishing AI error:', publishError);
      }
      throw error;
    }
  }

  async processPushedRepo(userId, repoId, repoData) {
    try {
      console.log(`[2025-06-25 08:39:05] Processing pushed repository for user: ${userId}, repository: ${repoId}`);
      const pushedRepo = new PushedRepo(userId, repoId);
      const response = await pushedRepo.processPushedRepo(userId, repoId, repoData, this.aiAdapter);
      await this.aiMessagingAdapter.publishPushedRepo({
        event: 'repoPushed',
        payload: {
          userId,
          repoId,
          response
        }
      });
      await this.aiPersistAdapter.savePushedRepo({
        userId,
        repoId,
        repoData
      });
      console.log(`[2025-06-25 08:39:05] Successfully processed repository ${repoId} for user anatolyZader`);
      return response;
    } catch (error) {
      console.error(`[2025-06-25 08:39:05] Error processing repository:`, error);
      throw error;
    }
  }
}

module.exports = AIService;