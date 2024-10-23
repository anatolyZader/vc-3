/* eslint-disable no-unused-vars */
// authRouter.js
'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function authRouter(fastify, opts) {

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

  fastify.route({
    method: 'GET',
    url: '/me',
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
    preValidation: [fastify.verifyToken],
    handler: fastify.refreshToken,
  });

});
