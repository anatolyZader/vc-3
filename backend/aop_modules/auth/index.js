// aop/auth/index.js
/* eslint-disable no-unused-vars */ 
const autoload = require('@fastify/autoload');
const path = require('path');

module.exports = async function authModuleIndex(fastify, opts) {

    fastify.register(autoload, {
      dir: path.join(__dirname, 'plugins'),
      options: {
        // prefix: '/auth'
      },
      encapsulate: false,
      maxDepth: 1,
      matchFilter: (path) =>  path.includes('Plugin')    
    });


  fastify.register(autoload, {
    dir: path.join(__dirname, 'application'),
    options: {
      // prefix: '/auth'
    },
    encapsulate: false,
    maxDepth: 1,
    matchFilter: (path) =>  path.includes('Controller')    
  });

fastify.register(autoload, {
  dir: path.join(__dirname, 'routes'),
  encapsulate: true,
  maxDepth: 1,
  matchFilter: (path) =>  path.includes('Router'),
  dirNameRoutePrefix: false
});
}

module.exports.autoPrefix = '/auth';