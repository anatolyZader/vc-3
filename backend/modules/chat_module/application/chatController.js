/* eslint-disable no-unused-vars */
// chatController.js
'use strict';

const fp = require('fastify-plugin');

async function chatController(fastify, options) {
  let chatService, chatPersistAdapter;

  try {
    chatService = await fastify.diContainer.resolve('chatService');
  } catch (error) {
    fastify.log.error('Error resolving chatService:', error);
    throw fastify.httpErrors.internalServerError(
      'Failed to resolve chatService. Ensure it is registered in the DI container.',
      { cause: error }
    );
  }

  try {
    chatPersistAdapter = await fastify.diContainer.resolve('chatPersistAdapter');
  } catch (error) {
    fastify.log.error('Error resolving chatPersistAdapter at chatController:', error); 
    throw fastify.httpErrors.internalServerError(
      'Failed to resolve chatPersistAdapter at chatController',
      { cause: error } 
    );
  }

  // Start a new conversation
  fastify.decorate('startConversation', async function (request, reply) {
    const { userId, title } = request.body;

    try {
      const conversationId = await chatService.startConversation(userId, title, chatPersistAdapter);
      return reply.status(201).send({ message: 'Conversation started successfully', conversationId });
    } catch (error) {
      fastify.log.error('Error starting conversation:', error);
      return reply.internalServerError('Failed to start conversation', { cause: error });
    }
  });

  // Fetch conversation history
  fastify.decorate('fetchConversationHistory', async function (request, reply) {
    const { userId } = request.query;

    try {
      const history = await chatService.fetchConversationHistory(userId, chatPersistAdapter);
      return reply.status(200).send(history);
    } catch (error) {
      fastify.log.error('Error fetching conversation history:', error);
      return reply.internalServerError('Failed to fetch conversation history', { cause: error });
    }
  });

  // Fetch a specific conversation
  fastify.decorate('fetchConversation', async function (request, reply) {
    const { userId } = request.query;
    const { conversationId } = request.params;

    try {
      const conversation = await chatService.fetchConversation(userId, conversationId, chatPersistAdapter);
      return reply.status(200).send(conversation);
    } catch (error) {
      fastify.log.error('Error fetching conversation:', error);
      return reply.internalServerError('Failed to fetch conversation', { cause: error });
    }
  });

  // Rename a conversation
  fastify.decorate('renameConversation', async function (request, reply) {
    const { conversationId } = request.params;
    const { newTitle, userId } = request.body;

    try {
      await chatService.renameConversation(userId, conversationId, newTitle, chatPersistAdapter);
      return reply.status(200).send({ message: 'Conversation renamed successfully' });
    } catch (error) {
      fastify.log.error('Error renaming conversation:', error);
      return reply.internalServerError('Failed to rename conversation', { cause: error });
    }
  });

  // Delete a conversation
  fastify.decorate('deleteConversation', async function (request, reply) {
    const { conversationId } = request.params;
    const { userId } = request.body;
    try {
      await chatService.deleteConversation(userId, conversationId, chatPersistAdapter);
      return reply.status(200).send({ message: 'Conversation deleted successfully' });
    } catch (error) {
      fastify.log.error('Error deleting conversation:', error);
      return reply.internalServerError('Failed to delete conversation', { cause: error });
    }
  });

  // Send a question
  fastify.decorate('sendQuestion', async function (request, reply) {
    const { conversationId } = request.params;
    const { userId, content, prompt } = request.body;

    try {
      const questionId = await chatService.sendQuestion(userId, conversationId,  prompt);
      return reply.status(200).send({ message: 'Question sent successfully', questionId });
    } catch (error) {
      fastify.log.error('Error sending question:', error);
      return reply.internalServerError('Failed to send question', { cause: error });
    }
  });
}

module.exports = fp(chatController);
