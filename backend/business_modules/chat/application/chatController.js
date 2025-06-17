// chatController.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function chatController(fastify, options) {

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
    console.log('=== FETCH CONVERSATIONS DEBUG - 2025-06-17 08:12:33 ===');
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

  // Send a question - FIXED VERSION with WebSocket support
  fastify.decorate('addQuestion', async (request, reply) => {
    try {
      const { conversationId } = request.params;
      const { prompt } = request.body;
      const userId = request.user.id;
      
      const chatService = await request.diScope.resolve('chatService');
      const questionId = await chatService.addQuestion(userId, conversationId, prompt);
      
      // Send immediate response
      reply.send({ questionId });
      
      // Generate AI response asynchronously
      setImmediate(async () => {
        try {
          const aiResponse = `Hello ${request.user.name || 'there'}! I received your message: "${prompt}". This is a simulated AI response that would be generated by your AI service in production.`;
          
          await chatService.addAnswer(userId, conversationId, aiResponse);
          
          // Send real-time update via WebSocket
          fastify.sendToUser(userId, {
            type: 'new_message',
            conversationId,
            message: {
              id: require('uuid').v4(),
              content: aiResponse,
              role: 'ai',
              created_at: new Date().toISOString()
            }
          });
          
          fastify.log.info(`AI response added to conversation ${conversationId}`);
        } catch (aiError) {
          fastify.log.error('Error adding AI response:', aiError);
          
          // Send error via WebSocket
          fastify.sendToUser(userId, {
            type: 'error',
            conversationId,
            error: 'Failed to generate AI response'
          });
        }
      });
      
    } catch (error) {
      fastify.log.error('Error sending question:', error);
      throw fastify.httpErrors.internalServerError('Failed to send question', { cause: error });
    }
  });

  // Send an answer
  fastify.decorate('addAnswer', async (request, reply) => {
    try {
      const { conversationId } = request.params;
      const { aiResponse } = request.body;
      const userId = request.user.id;
      
      const chatService = await request.diScope.resolve('chatService');
      const answerId = await chatService.addAnswer(userId, conversationId, aiResponse);
      return { answerId };
    } catch (error) {
      fastify.log.error('Error sending answer:', error);
      throw fastify.httpErrors.internalServerError('Failed to send answer', { cause: error });
    }
  });
}

module.exports = fp(chatController);