'use strict';
// wiki_module/index.js
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');
const autoload = require('@fastify/autoload');
const path = require('path');

module.exports = async function wikiModuleIndex(fastify, opts) {
  fastify.log.info('✅ wiki/index.js was registered');

  // First register plugins (including schema plugins)
  // await fastify.register(autoload, {
  //   dir: path.join(__dirname, 'plugins'),
  //   options: {},
  //   encapsulate: false,
  //   maxDepth: 1,
  //   matchFilter: (path) => path.includes('Plugin')    
  // });
  
  // Wait for plugins to be fully registered
  // This ensures schemas are available before controllers and routes are registered
  await fastify.after();
  
  // Then register controllers
  await fastify.register(autoload, {
    dir: path.join(__dirname, 'application'),
    encapsulate: false,
    maxDepth: 1,
    matchFilter: (filepath) => filepath.includes('Controller'),
  });

  // Finally register routes
  await fastify.register(autoload, {
    dir: path.join(__dirname, 'input'),
    encapsulate: false,
    maxDepth: 3,
    matchFilter: (filepath) => filepath.includes('Router'),
    dirNameRoutePrefix: false,
  });
}

module.exports.autoPrefix = '/api/wiki';