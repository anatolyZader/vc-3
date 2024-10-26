/* eslint-disable no-unused-vars */
// authRouter.js
'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function authRouter(fastify, opts) {

  fastify.route({
    method: 'GET',
    url: '/disco',
    handler: fastify.discoverUsers,
  });

  fastify.route({
    method: 'POST',
    url: '/register',
    schema: {
      body: fastify.getSchema('schema:auth:register') // [1.2]
    },
    handler: fastify.registerUser,
  });

  fastify.route({
    method: 'POST',
    url: '/login',
    schema: { 
      body: fastify.getSchema('schema:auth:register'),
      response: {
        200: fastify.getSchema('schema:auth:token')
      }
    },
    handler: fastify.loginUser,
  });

  // Route: POST /remove (Protected Route)
  fastify.route({
    method: 'POST',
    url: '/remove',
    preValidation: [fastify.verifyToken], // Use preValidation hook
    handler: fastify.removeUser,
  });

  fastify.route({
    method: 'GET',
    url: '/me',
    schema: {
      headers: fastify.getSchema('schema:auth:token-header'),
      response: {
        200: fastify.getSchema('schema:user')
      }
    },
    preValidation: [fastify.verifyToken], 
    handler: fastify.getMe,
  });

  fastify.route({
    method: 'POST',
    url: '/logout',
    preValidation: [fastify.verifyToken],
    handler: fastify.logoutUser,
  }); 
  

  fastify.route({
    method: 'POST',
    url: '/refresh',
    schema: {
      headers: fastify.getSchema('schema:auth:token-header'),
      response: {
        200: fastify.getSchema('schema:auth:token')
      }
    },
    preValidation: [fastify.verifyToken],
    handler: fastify.refreshToken,
  });

});
