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
    schema: fastify.getSchema('schema:chat:start-conversation'), 
  
  });

  // Route to fetch conversation history
  fastify.route({
    method: 'GET',
    url: '/history',
    handler: fastify.fetchConversationHistory,
    schema: fastify.getSchema('schema:chat:fetch-conversation-history')
  });

  // Route to fetch a specific conversation
  fastify.route({
    method: 'GET',
    url: '/:conversationId',
    handler: fastify.fetchConversation,
    schema: fastify.getSchema('schema:chat:fetch-conversation')
  });

  // Route to rename a conversation
  fastify.route({
    method: 'PATCH',
    url: '/:conversationId/rename',
    handler: fastify.renameConversation,
    schema: fastify.getSchema('schema:chat:rename-conversation')
  });

  // Route to delete a conversation
  fastify.route({
    method: 'DELETE',
    url: '/:conversationId',
    handler: fastify.deleteConversation,
    schema: fastify.getSchema('schema:chat:delete-conversation')
  });

  // Route to send a question
  fastify.route({
    method: 'POST',
    url: '/:conversationId/question',
    handler: fastify.sendQuestion,
    schema: fastify.getSchema('schema:chat:send-question')
  });
});
