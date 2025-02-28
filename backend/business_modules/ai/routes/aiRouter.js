/* eslint-disable no-unused-vars */
// aiRouter.js
'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function aiRouter(fastify, opts) {
  console.log('aiRouter is loaded!');

  fastify.route({
    method: 'POST',
    url: '/respond',
    preValidation: [fastify.verifyToken],
    handler: fastify.respondToPrompt,
    schema: fastify.getSchema('schema:ai-assist:respond-to-prompt')
  });
});
