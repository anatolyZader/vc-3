// modules/git_module/index.js 
/* eslint-disable no-unused-vars */
const autoload = require('@fastify/autoload');
const path = require('path');

module.exports = async function gitModuleIndex(fastify, opts) {

    fastify.register(autoload, {
      dir: path.join(__dirname, 'plugins'),
      options: {
        // prefix: '/git'
      },
      encapsulate: false,
      maxDepth: 1,
      matchFilter: (path) =>  path.includes('Plugin')    
    });


  fastify.register(autoload, {
    dir: path.join(__dirname, 'application'),
    options: {
      // prefix: '/git'
    },
    encapsulate: false,
    maxDepth: 1,
    matchFilter: (path) =>  path.includes('Controller')    
  });

fastify.register(autoload, {
  dir: path.join(__dirname, 'routes'),
  options: {
    // prefix: '/git'
  },
  encapsulate: false,
  maxDepth: 3,
  matchFilter: (path) =>  path.includes('Router')
});
}

module.exports.autoConfig = {
  prefix: '/git'
};