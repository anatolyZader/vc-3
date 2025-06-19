'use strict';
// swaggerPlugin.js
/* eslint-disable no-unused-vars */

'use strict';
// swaggerPlugin.js
/* eslint-disable no-unused-vars */

module.exports = async function (fastify, opts) {
  console.log('--- LOADING swaggerPlugin.js NOW ---');

  try {
    // First, register @fastify/swagger for OpenAPI spec generation
    await fastify.register(require('@fastify/swagger'), {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'EventStorm.me API',
          description: 'EventStorm API Documentation',
          version: '0.0.1',
          contact: {
            name: 'EventStorm Support',
            email: 'support@eventstorm.me'
          },
          license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT'
          }
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
              bearerFormat: 'JWT',
              description: 'Enter JWT token obtained from /api/auth/login'
            },
            cookieAuth: {
              type: 'apiKey',
              in: 'cookie',
              name: 'authToken',
              description: 'Authentication cookie set automatically on login'
            }
          }
        },
        // Global security requirement - can be overridden per endpoint
        security: [
          { bearerAuth: [] },
          { cookieAuth: [] }
        ]
      }
    });
    
    console.log('✅ @fastify/swagger registered successfully');
    
    // Then, register @fastify/swagger-ui for the web interface
    await fastify.register(require('@fastify/swagger-ui'), {
      routePrefix: '/api/doc',
      uiConfig: {
        docExpansion: 'list', // 'list', 'full', or 'none'
        deepLinking: false,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        defaultModelRendering: 'example', // 'example' or 'model'
        displayOperationId: false,
        displayRequestDuration: true,
        filter: false,
        maxDisplayedTags: -1,
        showExtensions: false,
        showCommonExtensions: false,
        tryItOutEnabled: true,
        persistAuthorization: true, // Keeps auth token between page refreshes
        layout: 'StandaloneLayout'
      },
      uiHooks: {
        onRequest: function (request, reply, next) {
          // Optional: Add custom headers or logging for Swagger UI requests
          fastify.log.debug('Swagger UI request:', request.url);
          next();
        }
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,
      transformSpecification: (swaggerObject, request, reply) => {
        // Optional: Transform the OpenAPI spec before serving
        // You can modify swaggerObject here if needed
        return swaggerObject;
      },
      transformSpecificationClone: true
    });
    
    console.log('✅ @fastify/swagger-ui registered successfully');
    console.log('📖 Swagger UI will be available at: /api/doc');
    
    // Verify decorators exist
    if (fastify.hasDecorator('swagger')) {
      console.log('✅ Swagger decorator is available');
    } else {
      console.log('❌ Swagger decorator is NOT available');
    }
    
    if (fastify.hasDecorator('swaggerCSP')) {
      console.log('✅ SwaggerCSP decorator is available');
    }
    
    // Add a hook to log when swagger spec is generated
    fastify.addHook('onReady', async () => {
      try {
        const spec = fastify.swagger();
        const pathCount = Object.keys(spec.paths || {}).length;
        console.log(`✅ OpenAPI specification generated with ${pathCount} paths`);
        
        // Log available endpoints by tag
        const endpointsByTag = {};
        Object.entries(spec.paths || {}).forEach(([path, methods]) => {
          Object.entries(methods).forEach(([method, operation]) => {
            if (operation.tags && operation.tags.length > 0) {
              operation.tags.forEach(tag => {
                if (!endpointsByTag[tag]) endpointsByTag[tag] = [];
                endpointsByTag[tag].push(`${method.toUpperCase()} ${path}`);
              });
            }
          });
        });
        
        console.log('📋 Available endpoints by tag:');
        Object.entries(endpointsByTag).forEach(([tag, endpoints]) => {
          console.log(`   ${tag}: ${endpoints.length} endpoints`);
          endpoints.forEach(endpoint => console.log(`     - ${endpoint}`));
        });
        
      } catch (error) {
        console.error('❌ Error generating OpenAPI spec:', error.message);
      }
    });
    
    // Optional: Add route to download OpenAPI spec as JSON
    fastify.get('/api/openapi.json', {
      schema: {
        tags: ['api'],
        summary: 'Download OpenAPI specification',
        description: 'Get the complete OpenAPI specification as JSON',
        response: {
          200: {
            type: 'object',
            description: 'OpenAPI 3.0 specification'
          }
        }
      }
    }, async (request, reply) => {
      return fastify.swagger();
    });
    
    // Optional: Add route to download OpenAPI spec as YAML
    fastify.get('/api/openapi.yaml', {
      schema: {
        tags: ['api'],
        summary: 'Download OpenAPI specification as YAML',
        description: 'Get the complete OpenAPI specification as YAML',
        response: {
          200: {
            type: 'string',
            description: 'OpenAPI 3.0 specification in YAML format'
          }
        }
      }
    }, async (request, reply) => {
      const yaml = require('js-yaml');
      const spec = fastify.swagger();
      reply.type('text/yaml');
      return yaml.dump(spec);
    });
    
  } catch (error) {
    console.error('❌ Error registering Swagger plugin:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
};

// Important: Do not encapsulate to make swagger available globally
module.exports.encapsulate = false;