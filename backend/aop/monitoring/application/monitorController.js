// monitorController.js
'use strict';

const fp = require('fastify-plugin');

async function monitorController(fastify, options) {
  fastify.decorate('checkHealth', async function (request, reply) {
    try {
      const monitorService = fastify.diContainer.resolve('monitorService'); 
      const healthStatus = await monitorService.checkHealth();
      reply.send(healthStatus); 
    } catch (error) {
      fastify.log.error('Health check failed:', error);
      reply.status(500).send({ error: 'Health check failed' });
    }
  });

  fastify.addHook('onReady', async function () { 
    try {
        monitorService = fastify.diContainer.resolve('monitorService');  = fastify.diContainer.resolve('userService');
      } catch (error) {
        fastify.log.error('Error resolving monitorService at authController:', error);
      }
  });
}

module.exports = fp(monitorController);