// modules/auth/index.js 
const autoload = require('@fastify/autoload');
const path = require('path');

module.exports = async function authModuleIndex(fastify, opts) {

    fastify.register(autoload, {
      dir: path.join(__dirname, 'plugins'),
      options: {
        prefix: opts.prefix
      },
      encapsulate: false,
      maxDepth: 1,
      matchFilter: (path) =>  path.includes('Plugin')    
    });


  fastify.register(autoload, {
    dir: path.join(__dirname, 'application'),
    options: {
      prefix: opts.prefix
    },
    encapsulate: false,
    maxDepth: 1,
    matchFilter: (path) =>  path.includes('Controller')    
  });

fastify.register(autoload, {
  dir: path.join(__dirname, 'routes'),
  options: {
    prefix: opts.prefix
  },
  encapsulate: false,
  maxDepth: 3,
  matchFilter: (path) =>  path.includes('Router')
});
}