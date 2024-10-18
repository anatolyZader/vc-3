/* eslint-disable no-unused-vars */
// authRouter.js
'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function authRouter(fastify, opts) {
  // Retrieve the schema for user registration
  const registerSchemaBody = fastify.getSchema('schema:auth:register');
  console.log(
    'Schema for "schema:auth:register" retrieved at authRouter.js:',
    registerSchemaBody
  );

  // Route: GET /disco
  fastify.route({
    method: 'GET',
    url: '/disco',
    handler: fastify.discoverUsers,
  });

  // Route: POST /register
  fastify.route({
    method: 'POST',
    url: '/register',
    handler: fastify.registerUser,
  });

  // Route: POST /login
  fastify.route({
    method: 'POST',
    url: '/login',
    handler: fastify.loginUser,
  });

  // Route: POST /remove (Protected Route)
  fastify.route({
    method: 'POST',
    url: '/remove',
    preValidation: [fastify.verifyToken], // Use preValidation hook
    handler: fastify.removeUser,
  });

  // Protected Routes
  // These routes require authentication using verifyToken

  // Route: GET /me
  fastify.route({
    method: 'GET',
    url: '/me',
    preValidation: [fastify.verifyToken], // Use preValidation hook
    handler: fastify.getMe,
  });

  // Route: POST /refresh
  fastify.route({
    method: 'POST',
    url: '/refresh',
    preValidation: [fastify.verifyToken],
    handler: fastify.refreshToken,
  });

  // Route: POST /logout
  fastify.route({
    method: 'POST',
    url: '/logout',
    preValidation: [fastify.verifyToken],
    handler: fastify.logoutUser,
  });
});
