// server.js

'use strict';

const fs = require('fs');
const path = require('path');
const Fastify = require('fastify');

// Import your Fastify plugins/configuration
const appModule = require('./app'); 

// HTTPS options
const httpsOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/eventstorm.me/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/eventstorm.me/fullchain.pem')
};

// Initialize Fastify with HTTPS
const fastify = Fastify({
  https: httpsOptions,
  logger: appModule.appConfig.logger,
  // Include other configurations if necessary
});

// Register your plugins and routes
fastify.register(appModule);

// Start the server
const start = async () => {
  try {
    await fastify.listen(443, '0.0.0.0');
    fastify.log.info(`Server is running on https://eventstorm.me`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
