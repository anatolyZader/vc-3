// target_module/index.js
'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');
const autoload = require('@fastify/autoload');
const path = require('path');

async function targetModuleIndex(fastify, opts) {
  fastify.log.info('✅ target/index.js was registered');

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

const plugin = fp(targetModuleIndex);
plugin.autoConfig = {
  prefix: '/target',
};

module.exports = plugin;
