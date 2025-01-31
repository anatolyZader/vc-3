// swaggerPlugin.js
/* eslint-disable no-unused-vars */
"use strict"

const fp = require('fastify-plugin');
const fastifySwagger = require('@fastify/swagger');
const fastifySwaggerUi = require('@fastify/swagger-ui');
const pkg = require('../../package.json');

module.exports = fp(async function swaggerPlugin (fastify, opts) {
  fastify.register(fastifySwagger, {
    swagger: {
      info: {
        title: 'vc-app',
        description: 'eventstorm me!',
        version: pkg.version
      }
    }
  });

  fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs', // Swagger UI available at /docs
    staticCSP: true, // Helps prevent CSP issues
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  });

});
