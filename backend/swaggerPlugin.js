'use strict';

const fp = require('fastify-plugin');

// Registers @fastify/swagger with the existing OpenAPI config
module.exports = fp(async function swaggerPlugin(fastify) {
  await fastify.register(require('@fastify/swagger'), {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'EventStorm.me API',
        description: 'EventStorm API – Git analysis, AI insights, docs, chat and more',
        version: '1.0.0',
      },
      servers: [
        {
          url: process.env.NODE_ENV === 'staging'
            ? 'https://eventstorm.me'
            : 'http://localhost:3000',
          description: process.env.NODE_ENV === 'staging'
            ? 'Production server'
            : 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          cookieAuth: { type: 'apiKey', in: 'cookie', name: 'authToken' },
        },
      },
      security: [{ bearerAuth: [] }, { cookieAuth: [] }],
    },
  });
});
