// AIService.js
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
      // Set the userId on the adapter before using it
      if (this.aiAdapter.setUserId) {
        this.aiAdapter.setUserId(userId);
      }
      
      const response = await this.aiAdapter.respondToPrompt(prompt);
      
      // Save the response
      await this.aiPersistAdapter.saveAiResponse(userId, conversationId, response);
      
      // Publish the response
      await this.aiMessagingAdapter.publishAiResponse('answerGenerated', {
        userId,
        conversationId,
        response
      });
      
      return response;
    } catch (error) {
      console.error('Error in AI service:', error);
      throw error;
    }
  }

  async processPushedRepo(userId, repoId, repoData) {
    try {
      console.log(`[${new Date().toISOString()}] Processing pushed repository for user: ${userId}, repository: ${repoId}`);
      const pushedRepo = new PushedRepo(userId, repoId);
      const response = await pushedRepo.processPushedRepo(userId, repoId, repoData, this.aiAdapter);

      // FIX: Changed to use publishAiResponse with 'repoPushed' event
      await this.aiMessagingAdapter.publishAiResponse('repoPushed', {
        userId,
        repoId,
        // The response from processPushedRepo might be a success object, pass it as 'data' or similar
        data: response 
      });

      await this.aiPersistAdapter.saveGitData(userId, repoId, JSON.stringify(repoData)); // Assuming repoData is complex, store as JSON string
      console.log(`[${new Date().toISOString()}] Successfully processed repository ${repoId} for user ${userId}`);
      return response;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error processing repository:`, error);
      throw error;
    }
  }
}

module.exports = AIService;
