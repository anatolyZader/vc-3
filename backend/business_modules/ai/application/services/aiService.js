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
      
      // Call the domain entity to get the response
      const aiResponse = new AIResponse(userId);
      const response = await aiResponse.respondToPrompt(userId, conversationId, prompt, this.aiAdapter);
      
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
  
  // New method to handle question generation from events
  async generateResponse(prompt, userId) {
    console.log(`[${new Date().toISOString()}] 🤖 AI SERVICE: Generating response for user ${userId}, prompt: "${prompt.substring(0, 100)}..."`);
    
    try {
      // Set the userId on the adapter if it's not already set
      if (this.aiAdapter && this.aiAdapter.setUserId) {
        this.aiAdapter.setUserId(userId);
        console.log(`[${new Date().toISOString()}] 🤖 AI SERVICE: Set userId ${userId} on AI adapter`);
      } else {
        console.warn(`[${new Date().toISOString()}] 🤖 AI SERVICE: Unable to set userId - aiAdapter missing or lacks setUserId method`);
        // Continue anyway - it might still work
      }
      
      // Validate the prompt
      if (!prompt) {
        console.error(`[${new Date().toISOString()}] 🤖 AI SERVICE: Empty prompt received, returning default response`);
        return "I'm sorry, but I didn't receive a question to answer. Could you please ask again?";
      }
      
      // Use the existing respondToPrompt method with a generated conversation ID if none was provided
      const conversationId = `gen-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const response = await this.respondToPrompt(userId, conversationId, prompt);
      
      if (response) {
        const responseText = typeof response === 'object' ? 
          (response.response || JSON.stringify(response)) : 
          response;
          
        console.log(`[${new Date().toISOString()}] 🤖 AI SERVICE: Generated response: "${responseText.substring(0, 100)}..."`);
        return responseText;
      } else {
        console.warn(`[${new Date().toISOString()}] 🤖 AI SERVICE: Got empty response from AI adapter, returning default message`);
        return "I'm sorry, but I couldn't generate a response at this time. Please try again later.";
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 🤖 AI SERVICE: Error generating response:`, error);
      return `I apologize, but I encountered an error while processing your request: ${error.message}. Please try again later.`;
    }
  }
}

module.exports = AIService;