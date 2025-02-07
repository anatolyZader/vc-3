/* eslint-disable no-unused-vars */
// aiAssistRouter.js
'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function aiAssistRouter(fastify, opts) {
  console.log('aiAssistRouter is loaded!');

  fastify.route({
    method: 'POST',
    url: '/start',
    handler: fastify.startConversation,
    schema: fastify.getSchema('schema:ai-assist:start-conversation'),
  });

  fastify.route({
    method: 'POST',
    url: '/respond',
    handler: fastify.respondToPrompt,
    schema: fastify.getSchema('schema:ai-assist:respond-to-prompt')
  });
});
