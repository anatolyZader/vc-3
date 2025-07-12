// api/index.js
/* eslint-disable no-unused-vars */
'use strict';


const fp = require('fastify-plugin');
const fs = require('fs');
const path = require('path');
const autoload = require('@fastify/autoload');

module.exports = async function apiModuleIndex(fastify, opts) {
  fastify.log.info('✅ api/index.js was registered');

  const allFiles = fs.readdirSync(__dirname);
  fastify.log.info(`Files in ai_module: ${JSON.stringify(allFiles)}`);
  
  // fastify.register(autoload, {
  //   dir: path.join(__dirname, 'plugins'),
  //   options: {
  //   },
  //   encapsulate: false,
  //   maxDepth: 1,
  //   matchFilter: (path) =>  path.includes('Plugin')    
  // });

  // Load application controllers
  fastify.register(autoload, {
    dir: path.join(__dirname, 'application'),
    encapsulate: false,
    maxDepth: 1,
    matchFilter: (filepath) => filepath.includes('Controller'),
  });


  fastify.register(autoload, {
    dir: path.join(__dirname, 'input'),    encapsulate: true,
    maxDepth: 1,
    matchFilter: (path) =>  path.includes('Router'),
    dirNameRoutePrefix: false
    });

}

module.exports.autoPrefix = '/api/api';



// plugin.autoConfig = { prefix: '/api' };


