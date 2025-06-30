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
  fastify.register(autoload, {
    dir: path.join(__dirname, 'application'),
    encapsulate: false,
    maxDepth: 1,
    matchFilter: (filepath) => filepath.includes('Controller'),
    dirNameRoutePrefix: false
  });

  fastify.register(autoload, {
    dir: path.join(__dirname, 'input'),    encapsulate: true,
    maxDepth: 1,
    matchFilter: (filepath) =>  filepath.includes('Router'),
    dirNameRoutePrefix: false,
     prefix: ''
    });

  await fastify.register(aiPubsubListener);

};

module.exports.autoPrefix = '/api/ai';






