// aop_modules/auth/index.js
/* eslint-disable no-unused-vars */
const fp = require('fastify-plugin'); 
const autoload = require('@fastify/autoload');
const path = require('path');

module.exports = fp(async function authModuleIndex(fastify, opts) {


  const moduleSpecificPrefix = opts.prefix ? `${opts.prefix}/${path.basename(__dirname)}` : `/${path.basename(__dirname)}`;

  fastify.register(autoload, {
    dir: path.join(__dirname, 'application'),

    encapsulate: false,
    maxDepth: 1,
    matchFilter: (filepath) => filepath.includes('Controller'), 
    prefix: moduleSpecificPrefix 
  });

  fastify.register(autoload, {
    dir: path.join(__dirname, 'input'),
    encapsulate: false, 
    maxDepth: 1,
    matchFilter: (filepath) => filepath.includes('Router'),     
    dirNameRoutePrefix: false,
    prefix: moduleSpecificPrefix 
  });
}); 

