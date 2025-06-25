// swaggerUIPlugin.js
/* eslint-disable no-unused-vars */
'use strict';

console.log('🖥️ Registering @fastify/swagger-ui');

module.exports = async function (fastify, opts) {
  await fastify.register(require('@fastify/swagger-ui'), {
    routePrefix: '/api/doc',
    staticCSP: true,
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      defaultModelRendering: 'example',
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
      persistAuthorization: true,
      layout: 'StandaloneLayout',
      customCss: `
        .swagger-ui .topbar{display:none;}
        .swagger-ui .info .title{color:#1f2937;}
        .swagger-ui .scheme-container{background:#f8f9fa;padding:10px;border-radius:4px;}
        .swagger-ui .info .description {font-size: 14px; line-height: 1.6;}
        .swagger-ui .btn.authorize {background-color: #4f46e5; border-color: #4f46e5;}
        .swagger-ui .btn.authorize:hover {background-color: #4338ca;}
      `,
      customSiteTitle: 'EventStorm.me API Docs',
      customfavIcon: '/favicon.ico',
      requestInterceptor: req => {
        console.log('🌐 Swagger UI Request:', {
          url: req.url, method: req.method, headers: req.headers
        });
        return req;
      },
      responseInterceptor: res => {
        console.log('📡 Swagger UI Response:', {
          url: res.url, status: res.status, statusText: res.statusText
        });
        return res;
      }
    },
    transformStaticCSP: (hdr) => {
      let newHdr = hdr.replace(
        /default-src 'self'/g,
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:"
      );
      if (process.env.NODE_ENV !== 'staging') {
        newHdr += "; connect-src 'self' http://localhost:3000 http://localhost:5173 http://127.0.0.1:3000 ws://localhost:* wss://localhost:* https: data: blob:";
      } else {
        newHdr += "; connect-src 'self' https: wss: data: blob:";
      }
      newHdr += "; style-src 'self' 'unsafe-inline' https:";
      newHdr += "; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:";
      return newHdr;
    },
    transformSpecificationClone: true,
    transformSpecification(spec) {
      spec.info['x-build-time'] = new Date().toISOString();
      spec.info['x-builder'] = 'anatolyZader';
      spec.info['x-environment'] = process.env.NODE_ENV || 'development';
      spec.info['x-node-version'] = process.version;

      if (process.env.NODE_ENV !== 'staging') {
        spec.servers = [
          { url: 'http://localhost:3000', description: 'Development server' },
          { url: 'http://127.0.0.1:3000', description: 'Development server (alternative)' }
        ];
      }

      spec.info['x-security-note'] = 'This API uses JWT Bearer tokens or cookie-based authentication';
      return spec;
    }
  });

  fastify.log.info('✅ Swagger UI ready at /api/doc');
};

module.exports.encapsulate = false;
