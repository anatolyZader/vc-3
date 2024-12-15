// modules/video/index.js 
const autoload = require('@fastify/autoload');
const path = require('path');

module.exports = async function videoModuleIndex(fastify, opts) {
  fastify.register(autoload, {
    dir: path.join(__dirname, 'routes'),
    options: {
      prefix: opts.prefix
    },
    encapsulate: false,
    maxDepth: 3,
    matchFilter: (path) => path.includes('Controller') || path.includes('Plugin') || path.includes('Router')
  });
  console.log('diContainer.registrations at video/index.js:', fastify.diContainer.registrations);
}