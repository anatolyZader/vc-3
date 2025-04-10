
// chat_module/index.js
/* eslint-disable no-unused-vars */

'use strict';

const fp = require('fastify-plugin');
const autoload = require('@fastify/autoload');
const path = require('path');

module.exports = async function chatModuleIndex(fastify, opts) {
  fastify.log.info('✅ chat/index.js was registered');

  // Load application controllers
  fastify.register(autoload, {
    dir: path.join(__dirname, 'application'),
    encapsulate: false,
    maxDepth: 1,
    matchFilter: (filepath) => filepath.includes('Controller'),
  });


  // Load route definitions but ignore top-level router.js (to avoid double registration)
  fastify.register(autoload, {
    dir: path.join(__dirname, 'routes'),
    encapsulate: true,
    maxDepth: 1,
    matchFilter: (path) => path.includes('Router'),
    dirNameRoutePrefix: false,
  });
}


module.exports.autoPrefix = '/chat';

