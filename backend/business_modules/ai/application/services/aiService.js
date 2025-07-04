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
      console.log(`[${new Date().toISOString()}] AI service processing prompt for user ${userId}: "${prompt.substring(0, 50)}..."`);
      
      // Set the userId on the adapter before using it
      if (this.aiAdapter.setUserId) {
        this.aiAdapter.setUserId(userId);
        console.log(`[${new Date().toISOString()}] Set userId on adapter: ${userId}`);
      }
      
      // Call the domain entity to get the response
      const aiResponse = new AIResponse(userId);
      const response = await aiResponse.respondToPrompt(conversationId, prompt, this.aiAdapter);
      
      console.log(`[${new Date().toISOString()}] Got response from AI adapter:`, typeof response);
      
      // Save the response to the database - but don't block on failure
      try {
        if (this.aiPersistAdapter) {
          await this.aiPersistAdapter.saveAiResponse({
            userId, 
            conversationId, 
            repoId: null, // Optional field
            prompt, 
            response: typeof response === 'object' ? JSON.stringify(response) : response
          });
          console.log(`[${new Date().toISOString()}] Saved AI response to database`);
        } else {
          console.warn(`[${new Date().toISOString()}] aiPersistAdapter is not available, skipping database save`);
        }
      } catch (dbError) {
        console.error(`[${new Date().toISOString()}] Failed to save AI response to database:`, dbError.message);
        // Continue even if database save fails - don't rethrow
      }
      
      // Return the response - extract content if it's an object with response property
      if (typeof response === 'object' && response !== null) {
        return response.response || response;
      }
      return response;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in AI service:`, error);
      
      // Check if it's an OpenAI API error related to quotas
      if (error.message && (
          error.message.includes('quota') || 
          error.message.includes('rate limit') || 
          error.message.includes('429')
        )) {
        return {
          success: false,
          response: "I'm currently experiencing high demand. Please try again in a few moments while I optimize my resources.",
          error: error.message
        };
      }
      
      // For any other error, let's provide a cleaner message
      return {
        success: false,
        response: "Sorry, I encountered a technical issue. Please try again shortly.",
        error: error.message
      };
    }
  }

  async processPushedRepo(userId, repoId, repoData) {
    try {
      console.log(`[${new Date().toISOString()}] Processing pushed repository for user: ${userId}, repository: ${repoId}`);
      
      // Set the userId on the adapter if it's not already set
      if (this.aiAdapter.setUserId) {
        this.aiAdapter.setUserId(userId);
      }
      
      const pushedRepo = new PushedRepo(userId, repoId);
      const response = await pushedRepo.processPushedRepo(userId, repoId, repoData, this.aiAdapter);

      // Publish the event using the messaging adapter
      try {
        if (this.aiMessagingAdapter) {
          await this.aiMessagingAdapter.publishAiResponse('repoPushed', {
            userId,
            repoId,
            data: response 
          });
        }
      } catch (messagingError) {
        console.error(`[${new Date().toISOString()}] Error publishing repoPushed event:`, messagingError);
        // Continue even if messaging fails
      }

      // Save the data to the database
      try {
        if (this.aiPersistAdapter) {
          await this.aiPersistAdapter.saveGitData(userId, repoId, JSON.stringify(repoData));
          console.log(`[${new Date().toISOString()}] Successfully processed repository ${repoId} for user ${userId}`);
        }
      } catch (dbError) {
        console.error(`[${new Date().toISOString()}] Error saving repository data:`, dbError);
        // Continue even if database save fails
      }
      
      return response;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error processing repository:`, error);
      throw error;
    }
  }
}

module.exports = AIService;