// ai/index.js
'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');
const fs = require('fs');
const path = require('path');
const autoload = require('@fastify/autoload');
const aiPubsubListener = require('./input/aiPubsubListener');

module.exports = async function aiModuleIndex(fastify, opts) {
  fastify.log.info('✅ ai/index.js was registered');

  const allFiles = fs.readdirSync(__dirname);
  fastify.log.info(`Files in ai_module: ${JSON.stringify(allFiles)}`);
  
  // Load application controllers
  await fastify.register(autoload, {
    dir: path.join(__dirname, 'application'),
    encapsulate: false,
    maxDepth: 1,
    matchFilter: (filepath) => filepath.includes('Controller'),
    dirNameRoutePrefix: false
  });

  await fastify.register(autoload, {
    dir: path.join(__dirname, 'input'),
    encapsulate: true,
    maxDepth: 1,
    matchFilter: (filepath) => filepath.includes('Router'),
    dirNameRoutePrefix: false,
    prefix: ''
  });

  // Register the AI pubsub listener
  await fastify.register(aiPubsubListener);
  console.log('aiPubsubListener registered:', !!fastify.aiPubsubListener);
  
  // Check if event dispatcher is available
  if (fastify.eventDispatcher) {
    fastify.log.info('✅ AI MODULE: eventDispatcher is available');
  } else {
    fastify.log.error('❌ AI MODULE: eventDispatcher is NOT available');
  }
 

};

module.exports.autoPrefix = '/api/ai';