// swaggerPlugin.js
'use strict';
/* eslint-disable no-unused-vars */

// Import necessary modules
const yaml = require('js-yaml'); // Required for YAML output
const fastifySwagger = require('@fastify/swagger'); // The core Swagger plugin
const fastifySwaggerUI = require('@fastify/swagger-ui'); // The Swagger UI plugin

module.exports = async function (fastify, opts) {
  console.log('--- LOADING Combined Swagger Plugin NOW ---');
  console.log(`⏰ Loading at: ${new Date().toISOString()}`);
  
  try {
    // ────────────────────────────────────────────────────────────────
    // 1️⃣ Register @fastify/swagger (spec generator) first
    // This ensures the fastify.swagger() decorator is available
    // ────────────────────────────────────────────────────────────────
    await fastify.register(fastifySwagger, {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'EventStorm.me API',
          description:
            'EventStorm API – Git analysis, AI insights, wiki, chat and more',
          version: '1.0.0',
          contact: {
            name: 'EventStorm Support',
            email: 'support@eventstorm.me',
            url: 'https://eventstorm.me/support'
          },
          license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
          termsOfService: 'https://eventstorm.me/terms'
        },
        servers: [
          {
            url: 'http://localhost:3000',
            description: 'Development server'
          }
        ],
        tags: [
          { name: 'auth', description: 'Authentication endpoints' },
          { name: 'git', description: 'Git-analysis endpoints' },
          { name: 'ai', description: 'AI-powered endpoints' },
          { name: 'chat', description: 'Chat endpoints' },
          { name: 'wiki', description: 'Wiki endpoints' },
          { name: 'api', description: 'Utility endpoints' }
        ],
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            cookieAuth: { type: 'apiKey', in: 'cookie', name: 'authToken' }
          },
          responses: {
            UnauthorizedError: {
              description: 'Authentication information is missing or invalid',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string' },
                      message: { type: 'string' },
                      statusCode: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        },
        security: [{ bearerAuth: [] }]
      },
      exposeRoute: true,
      hideUntagged: false
    });

    console.log('✅ @fastify/swagger registered');
    
    // Wait for routes to be registered
    await fastify.ready();
    
    // ────────────────────────────────────────────────────────────────
    // 2️⃣ Register @fastify/swagger-ui after @fastify/swagger
    // ────────────────────────────────────────────────────────────────
    await fastify.register(fastifySwaggerUI, {
      routePrefix: '/api/doc',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
        persistAuthorization: true
      },
      transformSpecificationClone: true
    });

    console.log('✅ @fastify/swagger-ui registered');
    console.log('📖 Docs at /api/doc');
    
  } catch (error) {
    console.error('❌ Error registering Swagger plugins:', error);
    throw error;
  }

  // Simple utility routes that don't depend on complex transformations
  fastify.get('/api/openapi.json', async (req, reply) => {
    return fastify.swagger();
  });

  fastify.get('/api/openapi.yaml', async (req, reply) => {
    const spec = fastify.swagger();
    reply.type('text/yaml');
    return yaml.dump(spec);
  });

  fastify.get('/api/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }));
};

// This ensures the plugin is not encapsulated
module.exports.encapsulate = false;