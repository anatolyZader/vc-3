// aop_modules/auth/index.js
/* eslint-disable no-unused-vars */
const autoload = require('@fastify/autoload');
const path = require('path');

// Export as raw async function without fastify-plugin wrapper
module.exports = async function authModuleIndex(fastify, opts) {

  // Register the auth plugin FIRST to ensure decorators are available
  await fastify.register(require('./authPlugin'));

  const moduleSpecificPrefix = opts.prefix ? `${opts.prefix}/${path.basename(__dirname)}` : `/${path.basename(__dirname)}`;

  // fastify.register(autoload, {
  //   dir: path.join(__dirname, 'plugins'),
  //   options: {
  //   },
  //   encapsulate: false,
  //   maxDepth: 1,
  //   matchFilter: (path) =>  path.includes('Plugin')    
  // });
  

  await fastify.register(autoload, {
    dir: path.join(__dirname, 'application'),
    encapsulate: false,
    maxDepth: 1,
    matchFilter: (filepath) => filepath.includes('Controller'), 
    prefix: moduleSpecificPrefix 
  });

  await fastify.register(autoload, {
    dir: path.join(__dirname, 'input'),
    encapsulate: false, 
    maxDepth: 1,
    matchFilter: (filepath) => filepath.includes('Router'),     
    dirNameRoutePrefix: false,
    prefix: moduleSpecificPrefix 
  });

};

