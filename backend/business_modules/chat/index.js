// chat_module/index.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');
const autoload = require('@fastify/autoload');
const path = require('path');
const chatPubsubListener = require('./input/chatPubsubListener'); 

module.exports = async function chatIndex(fastify, opts) {
  fastify.log.info('✅ chat/index.js was registered');

  // Load application controllers
  await fastify.register(autoload, {
    dir: path.join(__dirname, 'application'),
    encapsulate: false,
    maxDepth: 1,

    matchFilter: (filepath) => filepath.includes('Controller'),
  });


  // Load route definitions but ignore top-level router.js (to avoid double registration)
  fastify.register(autoload, {
    dir: path.join(__dirname, 'input'),
    encapsulate: false,
    maxDepth: 3,
    matchFilter: (filepath) => filepath.includes('Router'),
    dirNameRoutePrefix: false,
    // prefix: '/api/chat', 
    
  });

  // Register the Pub/Sub listener for chat events
  await fastify.register(chatPubsubListener);

};

module.exports.autoPrefix = '/api/chat';

