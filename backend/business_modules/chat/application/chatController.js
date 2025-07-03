// chatController.js
/* eslint-disable no-unused-vars */
'use strict';

const { v4: uuidv4 } = require('uuid'); // Add this import
const fp = require('fastify-plugin');

async function chatController(fastify, options) {

    fastify.decorate('connectWebSocket', async (request, reply) => {
    try {
      const { userId } = request.query;
      
      if (!userId) {
        throw fastify.httpErrors.badRequest('Missing userId parameter');
      }
      
      fastify.log.info(`[${new Date().toISOString()}] 🔗 WS connected for user ${userId} from ${request.ip}`);
      
      // Send welcome message
      if (fastify.sendToUser) {
        fastify.sendToUser(userId, {
          type: 'connected',
          message: 'WebSocket connected successfully',
          timestamp: new Date().toISOString()
        });
        
        fastify.log.debug(`[${new Date().toISOString()}] Welcome message sent to user ${userId}`);
      }
      
      return { connected: true, userId, timestamp: new Date().toISOString() };
    } catch (error) {
      fastify.log.error(`[${new Date().toISOString()}] WebSocket connection error:`, error);
      throw error;
    }
  });


  // Start conversation
  fastify.decorate('startConversation', async (request, reply) => {
    try {
      const { title } = request.body;
      const userId = request.user.id;
      
      const chatService = await request.diScope.resolve('chatService');
      const conversationId = await chatService.startConversation(userId, title);
      return { conversationId };
    } catch (error) {
      fastify.log.error('Error starting conversation:', error);
      throw fastify.httpErrors.internalServerError('Failed to start conversation', { cause: error });
    }
  });

  // Fetch conversations history
  fastify.decorate('fetchConversationsHistory', async (request, reply) => {
    console.log('=== FETCH CONVERSATIONS DEBUG - 2025-06-30 11:46:05 ===');
    console.log('Current user: anatolyZader');
    console.log('Request user object:', request.user);
    
    try {
      if (!request.user || !request.user.id) {
        console.error('❌ No user found in request token');
        throw fastify.httpErrors.unauthorized('User not authenticated');
      }
      
      const userId = request.user.id;
      console.log('✅ User ID from JWT token:', userId);
      
      // Resolve chat service
      console.log('🔄 Resolving chatService...');
      const chatService = await request.diScope.resolve('chatService');
      console.log('✅ ChatService resolved successfully');
      
      // Call the service
      console.log('🔄 Calling chatService.fetchConversationsHistory...');
      const history = await chatService.fetchConversationsHistory(userId);
      console.log('✅ History fetched successfully:', history?.length, 'conversations');
      console.log('📋 Conversations data:', JSON.stringify(history, null, 2));
      
      return history;
    } catch (error) {
      console.error('=== DETAILED ERROR ANALYSIS ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error constructor:', error.constructor.name);
      console.error('Is database error?', error.code);
      console.error('Error stack:', error.stack);
      console.error('================================');
      
      // Log the original error before wrapping it
      fastify.log.error('Original error in fetchConversationsHistory:', error);
      
      // Return the original error message instead of generic one
      throw fastify.httpErrors.internalServerError(`Chat history error: ${error.message}`, { cause: error });
    }
  });

  // Fetch specific conversation
  fastify.decorate('fetchConversation', async (request, reply) => {
    try {
      const { conversationId } = request.params;
      const userId = request.user.id;
      
      const chatService = await request.diScope.resolve('chatService');
      const conversation = await chatService.fetchConversation(userId, conversationId);
      return conversation;
    } catch (error) {
      fastify.log.error('Error fetching conversation:', error);
      throw fastify.httpErrors.internalServerError('Failed to fetch conversation', { cause: error });
    }
  });

  // Rename conversation
  fastify.decorate('renameConversation', async (request, reply) => {
    try {
      const { conversationId } = request.params;
      const { newTitle } = request.body;
      const userId = request.user.id;
      
      const chatService = await request.diScope.resolve('chatService');
      await chatService.renameConversation(userId, conversationId, newTitle);
      return { message: 'Conversation renamed successfully' };
    } catch (error) {
      fastify.log.error('Error renaming conversation:', error);
      throw fastify.httpErrors.internalServerError('Failed to rename conversation', { cause: error });
    }
  });

  // Delete conversation
  fastify.decorate('deleteConversation', async (request, reply) => {
    try {
      const { conversationId } = request.params;
      const userId = request.user.id;
      
      const chatService = await request.diScope.resolve('chatService');
      await chatService.deleteConversation(userId, conversationId);
      return { message: 'Conversation deleted successfully' };
    } catch (error) {
      fastify.log.error('Error deleting conversation:', error);
      throw fastify.httpErrors.internalServerError('Failed to delete conversation', { cause: error });
    }
  });

fastify.decorate('addQuestion', async (request, reply) => {
  const { conversationId } = request.params;
  const { prompt } = request.body;
  const userId = request.user.id;
  
  try {
    // Validate inputs
    if (!conversationId || !prompt?.trim()) {
      const error = 'Missing required parameters: conversationId or prompt';
      fastify.log.warn(`[${new Date().toISOString()}] ${error} for user ${userId}`);
      
      if (fastify.sendToUser) {
        fastify.sendToUser(userId, {
          type: 'error',
          conversationId,
          error: 'Invalid message. Please provide a valid question.',
          timestamp: new Date().toISOString()
        });
      }
      
      throw fastify.httpErrors.badRequest(error);
    }
    
    fastify.log.info(`[${new Date().toISOString()}] Processing question for user ${userId}, conversation ${conversationId}`);
    
    const chatService = await request.diScope.resolve('chatService');
    const questionId = await chatService.addQuestion(userId, conversationId, prompt);
    
    // Send immediate HTTP response
    reply.send({ 
      questionId, 
      status: 'received',
      message: 'Question received and processing...',
      timestamp: new Date().toISOString()
    });
    
    // ✅ REMOVED: The hardcoded AI response generation
    // The AI service should handle this via the event system
    
  } catch (error) {
    fastify.log.error(`[${new Date().toISOString()}] Error in addQuestion for user ${userId}:`, error);
    
    if (fastify.sendToUser && conversationId) {
      fastify.sendToUser(userId, {
        type: 'error',
        conversationId,
        error: 'Failed to process your question. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString(),
        retryable: true
      });
    }
    
    throw fastify.httpErrors.internalServerError('Failed to send question', { cause: error });
  }
});

  // Send an answer
  fastify.decorate('addAnswer', async (request, reply) => {
    try {
      const { conversationId } = request.params;
      const { aiResponse } = request.body;
      const userId = request.user.id;
      
      // ✅ Enhanced logging with timestamps
      fastify.log.info(`[2025-06-30 11:46:05] Adding answer to conversation ${conversationId} for user ${userId}`);
      
      const chatService = await request.diScope.resolve('chatService');
      const answerId = await chatService.addAnswer(userId, conversationId, aiResponse);
      
      return { 
        answerId,
        status: 'success',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`[2025-06-30 11:46:05] Error adding answer:`, error);
      throw fastify.httpErrors.internalServerError('Failed to add answer', { cause: error });
    }
  });
}

module.exports = fp(chatController);