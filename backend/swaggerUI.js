'use strict';

const fp = require('fastify-plugin');

// Registers @fastify/swagger-ui with the previous UI configuration
module.exports = fp(async function swaggerUIPlugin(fastify) {
  await fastify.register(require('@fastify/swagger-ui'), {
    routePrefix: '/api/doc',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      filter: true,
      persistAuthorization: true,
      layout: 'StandaloneLayout',
    },
    staticCSP: true,
    transformStaticCSP: (hdr) => {
      // Allow HTTP connections in development
      if (process.env.NODE_ENV === 'staging') {
        return hdr.replace(
          /default-src 'self'/,
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: https:"
        );
      } else {
        // Development: allow both HTTP and HTTPS
        return hdr.replace(
          /default-src 'self'/,
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: http: https:"
        );
      }
    },
    transformSpecificationClone: true,
    transformSpecification(spec) {
      spec.info['x-build-time'] = new Date().toISOString();
      return spec;
    },
  });
});
