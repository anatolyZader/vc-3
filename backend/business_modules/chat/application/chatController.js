// chatController.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function chatController(fastify, options) {

  // Start a new conversation
  fastify.decorate('startConversation', async (request, reply) => {
    try {
      const { title } = request.body;
      const userId = request.user.id; // Assuming user is set by verifyToken middleware
      
      const chatService = await fastify.diScope.resolve('chatService');
      const conversationId = await chatService.startConversation(userId, title);
      return { conversationId };
    } catch (error) {
      fastify.log.error('Error starting conversation:', error);
      throw fastify.httpErrors.internalServerError('Failed to start conversation', { cause: error });
    }
  });

  // Fetch conversations history
  fastify.decorate('fetchConversationsHistory', async (request, reply) => {
    try {
      const userId = request.user.id; // Assuming user is set by verifyToken middleware
      
      const chatService = await fastify.diScope.resolve('chatService');
      const history = await chatService.fetchConversationsHistory(userId);
      return history;
    } catch (error) {
      fastify.log.error('Error fetching conversation history:', error);
      throw fastify.httpErrors.internalServerError('Failed to fetch conversation history', { cause: error });
    }
  });

  // Fetch specific conversation
  fastify.decorate('fetchConversation', async (request, reply) => {
    try {
      const { conversationId } = request.params;
      const userId = request.user.id; // Assuming user is set by verifyToken middleware
      
      const chatService = await fastify.diScope.resolve('chatService');
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
      const userId = request.user.id; // Assuming user is set by verifyToken middleware
      
      const chatService = await fastify.diScope.resolve('chatService');
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
      const userId = request.user.id; // Assuming user is set by verifyToken middleware
      
      const chatService = await fastify.diScope.resolve('chatService');
      await chatService.deleteConversation(userId, conversationId);
      return { message: 'Conversation deleted successfully' };
    } catch (error) {
      fastify.log.error('Error deleting conversation:', error);
      throw fastify.httpErrors.internalServerError('Failed to delete conversation', { cause: error });
    }
  });

  // Send a question
  fastify.decorate('addQuestion', async (request, reply) => {
    try {
      const { conversationId } = request.params;
      const { prompt } = request.body;
      const userId = request.user.id; // Assuming user is set by verifyToken middleware
      
      const chatService = await fastify.diScope.resolve('chatService');
      const questionId = await chatService.addQuestion(userId, conversationId, prompt);
      return { questionId };
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
      const userId = request.user.id; // Assuming user is set by verifyToken middleware
      
      const chatService = await fastify.diScope.resolve('chatService');
      const answerId = await chatService.addAnswer(userId, conversationId, aiResponse);
      return { answerId };
    } catch (error) {
      fastify.log.error('Error sending answer:', error);
      throw fastify.httpErrors.internalServerError('Failed to send answer', { cause: error });
    }
  });
}

module.exports = fp(chatController);