// server.js

'use strict';
const appModule = require('./app'); 
const fastify = require('./fastify.config.js');

module.exports = appModule;

// Initialize and register all application plugins
fastify.register(require('./app.js'), {
  // Pass any options to app.js if needed
});

// Start the server
fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
