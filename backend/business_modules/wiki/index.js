'use strict';
// project_wiki_module/index.js
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');
const autoload = require('@fastify/autoload');
const path = require('path');

module.exports = async function wikiModuleIndex(fastify, opts) {
  fastify.log.info('✅ wiki/index.js was registered');

  fastify.register(autoload, {
    dir: path.join(__dirname, 'application'),
    encapsulate: false,
    maxDepth: 1,
    matchFilter: (filepath) => filepath.includes('Controller'),
  });

  fastify.register(autoload, {
    dir: path.join(__dirname, 'routes'),
    encapsulate: false,
    maxDepth: 3,
    matchFilter: (filepath) => filepath.includes('Router'),
    dirNameRoutePrefix: false,
  });
}


module.exports.autoPrefix = '/wiki';
