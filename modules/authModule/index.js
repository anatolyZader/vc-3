// vc-3/index.js 
const autoload = require('@fastify/autoload');
const path = require('path');

module.exports = async function authModuleIndex(app, opts) {
  app.register(autoload, {
    dir: path.join(__dirname, 'plugins'),
    options: {
      prefix: opts.prefix
    }
  });

  app.register(autoload, {
    dir: path.join(__dirname, 'routes'),
    options: {
      prefix: opts.prefix
    }
  });
}