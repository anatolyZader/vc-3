/* eslint-disable no-unused-vars */
const autoload = require('@fastify/autoload');
const path = require('path');

module.exports = async function aiAssistModuleIndex(fastify, opts) {

  fastify.register(autoload, {
    dir: path.join(__dirname, 'application'),
    encapsulate: false,
    maxDepth: 1,
    matchFilter: (path) => path.includes('Controller')
  });

  fastify.register(autoload, {
    dir: path.join(__dirname, 'routes'),
    options: {},
    encapsulate: false,
    maxDepth: 3,
    matchFilter: (path) => path.includes('Router')
  });
};

module.exports.autoConfig = {
  prefix: '/ai-assist'
};