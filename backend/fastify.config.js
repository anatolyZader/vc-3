// fastify.config.js
'use strict';
// Fastify CLI will automatically load a configuration file if it's named appropriately (e.g. fastify.config.js) and placed in the project’s root directory

const config = require('./config');

module.exports = {
  server: {
    port: Number(process.env.PORT) || 3000,
    host: '0.0.0.0'
  },
  options: {
    // logger: config.logger,
    trustProxy: true,
    // ignoreTrailingSlash: true
  },
};
