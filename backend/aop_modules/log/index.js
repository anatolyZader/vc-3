// aop/log/index.js
/* eslint-disable no-unused-vars */ 
const autoload = require('@fastify/autoload');
const path = require('path');

module.exports = async function logModuleIndex(fastify, opts) {

    fastify.register(autoload, {
      dir: path.join(__dirname, 'plugins'),
      options: {
      },
      encapsulate: false,
      maxDepth: 1,
      matchFilter: (path) =>  path.includes('Plugin')    
    });
};    

module.exports.autoConfig = {
  prefix: '/log'
};

