// chatRouter.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function chatRouter(fastify, opts) {
  console.log('chatRouter is loaded!');

  // start a new conversation
  fastify.route({
    method: 'POST',
    url: '/start',
    handler: fastify.startConversation,
    schema: fastify.getSchema('schema:chat:start-conversation'),
  });

  // fetch conversations history
  fastify.route({
    method: 'GET',
    url: '/history',
    handler: fastify.fetchConversationsHistory,
    schema: fastify.getSchema('schema:chat:fetch-conversations-history')
  });

  // fetch specific conversation
  fastify.route({
    method: 'GET',
    url: '/:conversationId',
    handler: fastify.fetchConversation,
    schema: fastify.getSchema('schema:chat:fetch-conversation')
  });

  // rename a conversation
  fastify.route({
    method: 'PATCH',
    url: '/:conversationId/rename',
    handler: fastify.renameConversation,
    schema: fastify.getSchema('schema:chat:rename-conversation')
  });

  // delete a conversation
  fastify.route({
    method: 'DELETE',
    url: '/:conversationId',
    handler: fastify.deleteConversation,
    schema: fastify.getSchema('schema:chat:delete-conversation')
  });

  // send a question
  fastify.route({
    method: 'POST',
    url: '/:conversationId/question',
    handler: fastify.addQuestion,
    schema: fastify.getSchema('schema:chat:send-question')
  });

  // send an answer
  fastify.route({
    method: 'POST',
    url: '/:conversationId/answer',
    handler: fastify.addAnswer,
    schema: fastify.getSchema('schema:chat:send-answer')
  });
});
