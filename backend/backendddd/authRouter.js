//add:
//   Validation Schema (schema:auth:login):
// {
//   "type": "object",
//   "required": ["email", "password"],
//   "properties": {
//     "email": { "type": "string", "format": "email" },
//     "password": { "type": "string", "minLength": 8 }
//   }
// }


'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function authRouter(fastify, opts) {
  // Ensure required decorators are registered
  if (
    !fastify.registerUser ||
    !fastify.loginUser ||
    !fastify.loginWithGoogle ||
    !fastify.initiateTwoStageVerification ||
    !fastify.verifyTwoStageCode ||
    !fastify.getMe ||
    !fastify.logoutUser ||
    !fastify.refreshToken
  ) {
    throw new Error('Required Fastify decorators are not registered.');
  }

  // Discover Users (Example functionality)
  fastify.route({
    method: 'GET',
    url: '/disco',
    handler: fastify.discoverUsers,
  });

  // Register new user
  fastify.route({
    method: 'POST',
    url: '/register',
    schema: {
      body: fastify.getSchema('schema:auth:register'), // Registration schema
    },
    handler: fastify.registerUser,
  });

  // Login with email and password
  fastify.route({
    method: 'POST',
    url: '/login',
    schema: {
      body: fastify.getSchema('schema:auth:login'), // Email/password validation schema
      response: {
        200: { type: 'object', properties: { success: { type: 'boolean' } } },
      },
    },
    handler: fastify.loginUser,
  });

  // Login with Google OAuth2
  fastify.route({
    method: 'POST',
    url: '/login/oauth',
    schema: {
      body: fastify.getSchema('schema:auth:oauth'), // Google OAuth schema
    },
    handler: fastify.loginWithGoogle,
  });

  // Initiate two-stage verification
  fastify.route({
    method: 'POST',
    url: '/verify/initiate',
    schema: {
      body: fastify.getSchema('schema:auth:verify-initiate'), // Two-stage verification initiation schema
    },
    handler: fastify.initiateTwoStageVerification,
  });

  // Complete two-stage verification
  fastify.route({
    method: 'POST',
    url: '/verify',
    schema: {
      body: fastify.getSchema('schema:auth:verify'), // Two-stage verification schema
    },
    handler: fastify.verifyTwoStageCode,
  });

  // Get user profile
  fastify.route({
    method: 'GET',
    url: '/me',
    schema: {
      headers: fastify.getSchema('schema:auth:token-header'),
      response: {
        200: fastify.getSchema('schema:user'), // User profile schema
      },
    },
    preValidation: [fastify.verifyToken], // Middleware to verify token
    handler: fastify.getMe,
  });

  // Logout user
  fastify.route({
    method: 'POST',
    url: '/logout',
    preValidation: [fastify.verifyToken],
    handler: fastify.logoutUser,
  });

  // Refresh token
  fastify.route({
    method: 'POST',
    url: '/refresh',
    schema: {
      headers: fastify.getSchema('schema:auth:token-header'),
      response: {
        200: fastify.getSchema('schema:auth:token'), // Token schema
      },
    },
    preValidation: [fastify.verifyToken],
    handler: fastify.refreshToken,
  });
});
