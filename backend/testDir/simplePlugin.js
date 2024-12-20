// simplePlugin.js

'use strict';

const fp = require('fastify-plugin');

async function simplePlugin(fastify, opts) {
  fastify.decorate('plugin1Func', function (name) {
    return `Hello, ${name}! This is plugin1.`;
  });

  fastify.after(async function () {
    try {
      const diRegistrations = await fastify.diContainer.registrations;
      console.log('diRegistration at simplePlugin after: ', diRegistrations);
    } catch (error) {
      fastify.log.error('Error in simplePlugin after:', error);
    }

    try {
        const userService = await fastify.diContainer.resolve('userService');
        fastify.log.info('userService resolved successfully in simplePlugin:', userService); 
    } catch (error) {
        fastify.log.error('Error resolvin userService in simplePlugin after:', error);
      }
  });

};


module.exports = fp(simplePlugin);