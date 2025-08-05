// authRouter.js
'use strict';
const fp = require('fastify-plugin');

module.exports = fp(async function authRouter(fastify, opts) {

  console.log('authRouter is loaded!');

  // GET /api/auth/disco
  fastify.route({
    method: 'GET',
    url: '/api/auth/disco',
    schema: {
      tags: ['auth'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            users: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  email: { type: 'string', format: 'email' },
                  username: { type: 'string' }
                },
                required: ['id', 'email', 'username'],
                additionalProperties: false
              }
            }
          },
          required: ['message', 'users'],
          additionalProperties: false
        }
      }
    },
    handler: fastify.readAllUsers,
  });

  // POST /api/auth/register
  fastify.route({
    method: 'POST',
    url: '/api/auth/register',
    schema: {
      tags: ['auth'],
      body: {
        type: 'object',
        properties: {
          username: { type: 'string', maxLength: 50 },
          email: { type: 'string', format: 'email', maxLength: 255 },
          password: { type: 'string', minLength: 8, maxLength: 100 }
        },
        required: ['username', 'email', 'password'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                username: { type: 'string' }
              },
              required: ['id', 'email', 'username'],
              additionalProperties: false
            }
          },
          required: ['message', 'user'],
          additionalProperties: false
        }
      }
    },
    handler: fastify.registerUser,
  });

  // DELETE /api/auth/remove
  fastify.route({
    method: 'DELETE',
    url: '/api/auth/remove',
    schema: {
      tags: ['auth'],
      querystring: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' }
        },
        additionalProperties: false
      },
      response: {
        204: {
          description: 'No Content'
        }
      }
    },
    handler: fastify.removeUser
  });

  // POST /api/auth/login
  fastify.route({
    method: 'POST',
    url: '/api/auth/login',
    schema: {
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                username: { type: 'string' }
              },
              required: ['id', 'email', 'username'],
              additionalProperties: false
            }
          },
          required: ['message', 'user'],
          additionalProperties: false
        }
      }
    },
    handler: fastify.loginUser,
  });

  // GET /api/auth/me
  fastify.route({
    method: 'GET',
    url: '/api/auth/me',
    schema: {
      tags: ['auth'],
      headers: {
        type: 'object',
        properties: {
          authorization: {
            type: 'string',
            pattern: '^Bearer [a-zA-Z0-9-._~+/]+=*$'
          }
        },
        additionalProperties: true
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string' }
          },
          required: ['id', 'username'],
          additionalProperties: false
        }
      }
    },
    preValidation: [fastify.verifyToken],
    handler: fastify.getUserInfo,
  });

  // POST /api/auth/logout
  fastify.route({
    method: 'POST',
    url: '/api/auth/logout',
    schema: {
      tags: ['auth'],
      response: {
        204: {
          description: 'No Content'
        }
     }
    },
    preValidation: [fastify.verifyToken],
    handler: fastify.logoutUser,
  });

  // POST /api/auth/refresh
  fastify.route({
    method: 'POST',
    url: '/api/auth/refresh',
    schema: {
      tags: ['auth'],
      headers: {
        type: 'object',
        properties: {
          authorization: {
            type: 'string',
            pattern: '^Bearer [a-zA-Z0-9-._~+/]+=*$'
          }
        },
        additionalProperties: true
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' }
          },
          required: ['token'],
          additionalProperties: false
        }
      }
    },
    preValidation: [fastify.verifyToken],
    handler: fastify.refreshToken,
  });

// Privacy Policy Route
fastify.route({
  method: 'GET',
  url: '/api/privacy',
  schema: {
    tags: ['auth'],
    response: {
      200: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'HTML content for the privacy policy page'
          }
        }
      }
    }
  },
  handler: async (request, reply) => {
    const htmlContent = `
      <h1>Privacy Policy</h1>
      <p>This page is under construction. We will publish our final policy soon.</p>
    `;
    reply.type('text/html').send(htmlContent);
  }
});

// Termss of Service Route
fastify.route({
  method: 'GET',
  url: '/api/terms',
  schema: {
    tags: ['auth'],
    response: {
      200: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'HTML content for the terms of service page'
          }
        }
      }
    }
  },
  handler: async (request, reply) => {
    const htmlContent = `
      <h1>Terms of Service</h1>
      <p>This page is under construction. We will publish our official terms soon.</p>
    `;
    reply.type('text/html').send(htmlContent);
  }
});

});