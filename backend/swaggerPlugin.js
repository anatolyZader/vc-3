// swaggerPlugin.js
'use strict';
/* eslint-disable no-unused-vars */

// Import necessary modules
const yaml = require('js-yaml'); // Required for YAML output
const fastifySwagger = require('@fastify/swagger'); // The core Swagger plugin
const fp = require('fastify-plugin');

module.exports = fp(async function (fastify, opts) {
  console.log('--- LOADING Swagger Spec Generation Plugin ---');
  console.log(`⏰ Loading at: ${new Date().toISOString()}`);
  
  // Define a hook to sanitize route schemas before Swagger processes them
fastify.addHook('onRoute', (routeOptions) => {
  if (!routeOptions.schema) {
    console.log(`⚠️ Route missing schema: ${routeOptions.method} ${routeOptions.url}`);
    return;
  }

  console.log(`🔍 Processing schema for route: ${routeOptions.method} ${routeOptions.url}`);
  console.log(`Initial Schema: ${JSON.stringify(routeOptions.schema, null, 2)}`);

  try {
    const schemaParts = ['body', 'querystring', 'params', 'response'];
    schemaParts.forEach((part) => {
      if (routeOptions.schema[part]) {
        if (typeof routeOptions.schema[part] !== 'object') {
          console.warn(`⚠️ Invalid schema.${part} for route ${routeOptions.method}:${routeOptions.url} - removing to prevent Swagger errors`);
          delete routeOptions.schema[part];
        } else if (!routeOptions.schema[part].type) {
          console.warn(`⚠️ Missing "type" in schema.${part} for route ${routeOptions.method}:${routeOptions.url}`);
        }
      }
    });

    if (routeOptions.schema.response && typeof routeOptions.schema.response === 'object') {
      Object.keys(routeOptions.schema.response).forEach((statusCode) => {
        const response = routeOptions.schema.response[statusCode];
        if (response && typeof response !== 'object') {
          console.warn(`⚠️ Invalid response schema for status ${statusCode} in route ${routeOptions.method}:${routeOptions.url}`);
          delete routeOptions.schema.response[statusCode];
        } else if (response && !response.type) {
          console.warn(`⚠️ Missing "type" in response schema for status ${statusCode} in route ${routeOptions.method}:${routeOptions.url}`);
        }
      });
    }

    console.log(`✅ Final Schema for route ${routeOptions.method} ${routeOptions.url}:`, JSON.stringify(routeOptions.schema, null, 2));
  } catch (error) {
    console.error(`❌ Error processing schema for route ${routeOptions.method}:${routeOptions.url}:`, error.message);
  }
});
  
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

    // We will register the swagger-ui plugin in a separate file
    console.log('✅ @fastify/swagger registered');
    console.log('📖 Swagger spec ready for UI');
    
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
});

// This ensures the plugin is not encapsulated
module.exports.encapsulate = false;