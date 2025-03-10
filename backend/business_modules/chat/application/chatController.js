/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function chatController(fastify, options) {
  let chatService;

  try {
    chatService = await fastify.diContainer.resolve('chatService');
  } catch (error) {
    fastify.log.error('Error resolving chatService:', error);
    throw fastify.httpErrors.internalServerError(
      'Failed to resolve chatService. Ensure it is registered in the DI container.',
      { cause: error }
    );
  }

  // Start a new conversation
  fastify.decorate('startConversation', async (userId, title) => {
    try {
      const conversationId = await chatService.startConversation(userId, title);
      return conversationId;
    } catch (error) {
      fastify.log.error('Error starting conversation:', error);
      throw fastify.httpErrors.internalServerError('Failed to start conversation', { cause: error });
    }
  });

  // Fetch conversations history
  fastify.decorate('fetchConversationsHistory', async (userId) => {
    try {
      const history = await chatService.fetchConversationsHistory(userId);
      return history;
    } catch (error) {
      fastify.log.error('Error fetching conversation history:', error);
      throw fastify.httpErrors.internalServerError('Failed to fetch conversation history', { cause: error });
    }
  });

  // Fetch specific conversation
  fastify.decorate('fetchConversation', async (userId, conversationId) => {
    try {
      const conversation = await chatService.fetchConversation(userId, conversationId);
      return conversation;
    } catch (error) {
      fastify.log.error('Error fetching conversation:', error);
      throw fastify.httpErrors.internalServerError('Failed to fetch conversation', { cause: error });
    }
  });

  // Rename conversation
  fastify.decorate('renameConversation', async (userId, conversationId, newTitle) => {
    try {
      await chatService.renameConversation(userId, conversationId, newTitle);
      return { message: 'Conversation renamed successfully' };
    } catch (error) {
      fastify.log.error('Error renaming conversation:', error);
      throw fastify.httpErrors.internalServerError('Failed to rename conversation', { cause: error });
    }
  });

  // Delete conversation
  fastify.decorate('deleteConversation', async (userId, conversationId) => {
    try {
      await chatService.deleteConversation(userId, conversationId);
      return { message: 'Conversation deleted successfully' };
    } catch (error) {
      fastify.log.error('Error deleting conversation:', error);
      throw fastify.httpErrors.internalServerError('Failed to delete conversation', { cause: error });
    }
  });

  // Send a question
  fastify.decorate('addQuestion', async (userId, conversationId, prompt) => {
    try {
      const questionId = await chatService.addQuestion(userId, conversationId, prompt);
      return questionId;
    } catch (error) {
      fastify.log.error('Error sending question:', error);
      throw fastify.httpErrors.internalServerError('Failed to send question', { cause: error });
    }
  });

  // Send an answer
  fastify.decorate('addAnswer', async (userId, conversationId, aiResponse) => {
    try {
      const answerId = await chatService.addAnswer(userId, conversationId, aiResponse);
      return answerId;
    } catch (error) {
      fastify.log.error('Error sending answer:', error);
      throw fastify.httpErrors.internalServerError('Failed to send answer', { cause: error });
    }
  });
}

module.exports = fp(chatController);
