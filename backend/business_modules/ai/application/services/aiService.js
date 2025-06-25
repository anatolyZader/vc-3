// aiService.js
'use strict';

const IAIService = require('./interfaces/IAIService');

class AIService extends IAIService {
  constructor({aiAdapter, aiPersistAdapter, aiMessagingAdapter}) {
    super();
    this.aiAdapter = aiAdapter;
    this.aiPersistAdapter = aiPersistAdapter;
    this.aiMessagingAdapter = aiMessagingAdapter;
  }

  async respondToPrompt(userId, conversationId, prompt) {
    try {
      console.log(`[2025-06-25 08:39:05] Processing prompt for user ${userId}, conversation ${conversationId}`);
      
      // Direct call to AI adapter - repositories are already processed and indexed
      const aiResponse = await this.aiAdapter.respondToPrompt(
        conversationId,
        prompt
      );

      // Persist AI response
      try { 
        await this.aiPersistAdapter.saveAiResponse({
          userId,
          conversationId,
          prompt,
          aiResponse: aiResponse.response || aiResponse,
        });
        console.log(`[2025-06-25 08:39:05] AI response persisted for conversation ${conversationId}`);
      } catch (error) {
        console.error('[2025-06-25 08:39:05] Error persisting AI response:', error);
      }

      // Publish the AI response back to chat module
      await this.aiMessagingAdapter.publishAiResponse({
        event: 'aiResponseReceived',
        payload: {
          userId,
          conversationId,
          response: aiResponse.response || aiResponse
        }
      });

      console.log(`[2025-06-25 08:39:05] AI response published for user ${userId}`);
      
      return aiResponse;

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

  async processPushedRepo(userId, repoId) { 
    try {
      console.log(`[2025-06-25 08:39:05] Processing pushed repository for user: ${userId}, repository: ${repoId}`);
      
      const result = await this.aiAdapter.processPushedRepo(userId, repoId);
      
      console.log(`[2025-06-25 08:39:05] Successfully processed repository ${repoId} for user anatolyZader`);
      return result;
      
    } catch (error) {
      console.error(`[2025-06-25 08:39:05] Error processing repository:`, error);
      throw error;
    }
  }
}

module.exports = AIService;