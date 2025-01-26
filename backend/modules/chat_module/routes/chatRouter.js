/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function chatRouter(fastify, opts) {
  console.log('chatRouter is loaded!');

  // Route to start a new conversation
  fastify.route({
    method: 'POST',
    url: '/start',
    handler: fastify.startConversation,
  });

  // Route to fetch conversation history
  fastify.route({
    method: 'GET',
    url: '/history',
    handler: fastify.fetchConversationHistory,
  });

  // Route to fetch a specific conversation
  fastify.route({
    method: 'GET',
    url: '/:conversationId',
    handler: fastify.fetchConversation,
  });

  // Route to rename a conversation
  fastify.route({
    method: 'PATCH',
    url: '/:conversationId/rename',
    handler: fastify.renameConversation,
  });

  // Route to delete a conversation
  fastify.route({
    method: 'DELETE',
    url: '/:conversationId',
    handler: fastify.deleteConversation,
  });

  // Route to send a question
  fastify.route({
    method: 'POST',
    url: '/:conversationId/question',
    handler: fastify.sendQuestion,
  });
});
