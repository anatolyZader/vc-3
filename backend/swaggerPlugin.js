'use strict';

module.exports = async function (fastify, opts) {
  console.log('--- LOADING swaggerPlugin.js NOW ---');

  try {
    // Register using the official pattern with exposeRoute
    await fastify.register(require('@fastify/swagger'), {
      openapi: {
        openapi: '3.0.0',
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
      // This automatically exposes the documentation route
      exposeRoute: true,
      // Custom route prefix for the documentation
      routePrefix: '/api/doc',
      // Hide routes without tags if needed
      hideUntagged: false
    });
    
    console.log('✅ @fastify/swagger registered successfully with exposeRoute');
    
    // Verify the decorator exists
    if (fastify.hasDecorator('swagger')) {
      console.log('✅ Swagger decorator is available');
    } else {
      console.log('❌ Swagger decorator is NOT available');
    }
    
  } catch (error) {
    console.error('❌ Error registering Swagger plugin:', error);
    throw error;
  }
};

// Important: Do not encapsulate to make swagger available globally
module.exports.encapsulate = false;