/* eslint-disable no-unused-vars */
// chatController.js
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
  fastify.decorate('startConversation', async function (request, reply) {
    const { id: userId } = request.user;
    const { title } = request.body;
    try {
      const conversationId = await chatService.startConversation(userId, title);
      return reply.status(201).send({ message: 'Conversation started successfully', conversationId });
    } catch (error) {
      fastify.log.error('Error starting conversation:', error);
      return reply.internalServerError('Failed to start conversation', { cause: error });
    }
  });

  // Fetch conversations history
  fastify.decorate('fetchConversationsHistory', async function (request, reply) {
    const { id: userId } = request.user;
    try {
      const history = await chatService.fetchConversationsHistory(userId);
      return reply.status(200).send(history);
    } catch (error) {
      fastify.log.error('Error fetching conversation history:', error);
      return reply.internalServerError('Failed to fetch conversation history', { cause: error });
    }
  });

  // Fetch specific conversation
  fastify.decorate('fetchConversation', async function (request, reply) {
    const { id: userId } = request.user;
    const { conversationId } = request.params;
    try {
      const conversation = await chatService.fetchConversation(userId, conversationId);
      return reply.status(200).send(conversation);
    } catch (error) {
      fastify.log.error('Error fetching conversation:', error);
      return reply.internalServerError('Failed to fetch conversation', { cause: error });
    }
  });

  // Rename conversation
  fastify.decorate('renameConversation', async function (request, reply) {
    const { id: userId } = request.user;
    const { conversationId } = request.params;
    const { newTitle } = request.body;

    try {
      await chatService.renameConversation(userId, conversationId, newTitle);
      return reply.status(200).send({ message: 'Conversation renamed successfully' });
    } catch (error) {
      fastify.log.error('Error renaming conversation:', error);
      return reply.internalServerError('Failed to rename conversation', { cause: error });
    }
  });

  // Delete conversation
  fastify.decorate('deleteConversation', async function (request, reply) {
    const { id: userId } = request.user;
    const { conversationId } = request.params;
    try {
      await chatService.deleteConversation(userId, conversationId);
      return reply.status(200).send({ message: 'Conversation deleted successfully' });
    } catch (error) {
      fastify.log.error('Error deleting conversation:', error);
      return reply.internalServerError('Failed to delete conversation', { cause: error });
    }
  });

  // send question
  fastify.decorate('sendQuestion', async function (request, reply) {
    const { id: userId } = request.user;
    const { conversationId } = request.params;
    const { prompt } = request.body;

    try {
      const questionId = await chatService.sendQuestion(userId, conversationId, prompt);
      return reply.status(200).send({ message: 'Question sent successfully', questionId });
    } catch (error) {
      fastify.log.error('Error sending question:', error);
      return reply.internalServerError('Failed to send question', { cause: error });
    }
  });

  // send answer
  fastify.decorate('sendAnswer', async function (request, reply) {
    const { id: userId } = request.user
    const { conversationId } = request.params;
    const { aiResponse } = request.body;

    try {
      const answerId = await chatService.sendAnswer(userId, conversationId, aiResponse);
      return reply.status(200).send({ message: 'Answer sent successfully', answerId });
    } catch (error) {
      fastify.log.error('Error sending answer:', error);
      return reply.internalServerError('Failed to send answer', { cause: error });
    }
  });
}

module.exports = fp(chatController);
