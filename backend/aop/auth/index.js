// vc-3/index.js 
const autoload = require('@fastify/autoload');
const path = require('path');

module.exports = async function authModuleIndex(fastify, opts) {
  fastify.register(autoload, {
    dir: path.join(__dirname, 'plugins'),
    options: {
      prefix: opts.prefix,
      encapsulate: false
    }
  });

  fastify.register(autoload, {
    dir: path.join(__dirname, 'routes'),
    options: {
      prefix: opts.prefix,
      autoHooks: true, // Apply hooks from autohooks.js file(s) to plugins found in folder
      encapsulate: false
    }
  });
  
  fastify.addSchema(require('./routes/schemas/register.json'));

}