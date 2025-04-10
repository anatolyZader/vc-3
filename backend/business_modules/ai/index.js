// ai/index.js
'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');
const fs = require('fs');
const path = require('path');
const autoload = require('@fastify/autoload');

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
  });


  fastify.register(autoload, {
    dir: path.join(__dirname, 'routes'),    encapsulate: true,
    maxDepth: 1,
    matchFilter: (path) =>  path.includes('Router'),
    dirNameRoutePrefix: false
    });

}

module.exports.autoPrefix = '/ai';



// plugin.autoConfig = { prefix: '/ai' };

// module.exports = plugin;
