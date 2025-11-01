// modules/git_module/index.js 
/* eslint-disable no-unused-vars */

const autoload = require('@fastify/autoload');
const path = require('path');
const gitPubsubListener = require('./input/gitPubsubListener');

module.exports = async function gitModuleIndex(fastify, opts) {

  // fastify.register(autoload, {
  //   dir: path.join(__dirname, 'plugins'),
  //   options: {
  //   },
  //   encapsulate: false,
  //   maxDepth: 1,
  //   matchFilter: (path) =>  path.includes('Plugin')    
  // });


  fastify.register(autoload, {
    dir: path.join(__dirname, 'application'),
    options: {
    },
    encapsulate: false,
    maxDepth: 1,
    matchFilter: (path) =>  path.includes('Controller')    
  });

  fastify.register(autoload, {
    dir: path.join(__dirname, 'input'),
    options: {
    },
    encapsulate: false,
    maxDepth: 3,
    matchFilter: (path) =>  path.includes('Router'),
    dirNameRoutePrefix: true
  });

  // Register Git Module's Pub/Sub listener (git-module-sub)
  // Handles: fetchRepoRequest, fetchDocsRequest, persistRepoRequest
  await fastify.register(gitPubsubListener);
  fastify.log.info('✅ Git Module: Pub/Sub listener registered (git-module-sub)');
}

module.exports.autoConfig = {
  prefix: '/api/git'
};