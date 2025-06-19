// generateSpec.js
'use strict';

const fs = require('fs');
const path = require('path');
const fastify = require('fastify')({ logger: false });

async function writeSpec() {
  // Register Fastify Swagger directly in generateSpec.js
  await fastify.register(require('@fastify/swagger'), {
    openapi: {
      info: {
        title: 'EventStorm.me API',
        description: 'EventStorm API Documentation',
        version: '1.0.0'
      },
      servers: [
        {
          url: process.env.NODE_ENV === 'production' ? 'https://eventstorm.me' : 'http://localhost:3000',
          description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
        }
      ],
      tags: [
        { name: 'auth', description: 'Authentication endpoints' },
        { name: 'ai', description: 'AI service endpoints' },
        { name: 'chat', description: 'Chat service endpoints' },
        { name: 'git', description: 'Git service endpoints' },
        { name: 'wiki', description: 'Wiki service endpoints' },
        { name: 'api', description: 'API management endpoints' }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          },
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'authToken'
          }
        }
      }
    },
    exposeRoute: true, // Important for fastify.swagger() to work
    routePrefix: '/api/doc',
    hideUntagged: false
  });

  // Register your app, which will now add routes to this Fastify instance
  await fastify.register(require('./app'));
  await fastify.ready();

  // generate the OpenAPI spec
  const spec = fastify.swagger();

  // resolve the target file
  const out = path.resolve(
    __dirname,
    'business_modules',
    'api',
    'infrastructure',
    'api',
    'httpApiSpec.json'
  );

  // ensure the directory exists
  fs.mkdirSync(path.dirname(out), { recursive: true });

  // write the spec
  fs.writeFileSync(out, JSON.stringify(spec, null, 2), 'utf8');

  console.log(`✔️  OpenAPI spec written to ${out}`);
  await fastify.close();
  process.exit(0);
}

writeSpec().catch(err => {
  console.error(err);
  process.exit(1);
});