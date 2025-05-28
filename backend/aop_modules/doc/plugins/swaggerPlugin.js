// swaggerPlugin.js
/* eslint-disable no-unused-vars */
'use strict';

module.exports = async function (fastify, opts) {
  console.log('--- LOADING swaggerPlugin.js NOW ---');

  fastify.register(require('@fastify/swagger'), {
    routePrefix: '/api/doc',
    swagger: {
      info: {
        title: 'EventStorm.me API',
        description: 'olala!',
        version: '1.0.0'
      },
      host: 'eventstorm.me',
      schemes: ['https'],
      consumes: ['application/json'],
      produces: ['application/json']
    },
    exposeRoute: true
  });
  
  // Then register the UI:
  fastify.register(require('@fastify/swagger-ui'), {
    routePrefix: '/api/doc', // same as above or a sub-route
    // you can optionally specify more UI config here
    // e.g. uiConfig: { docExpansion: 'full' }
  });
  
};
