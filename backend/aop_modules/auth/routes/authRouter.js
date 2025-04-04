'use strict';
/* eslint-disable no-unused-vars */
// authRouter.js
const fp = require('fastify-plugin');

module.exports = fp(async function authRouter(fastify, opts) {

  console.log('authRouter is loaded!');


  fastify.route({
    method: 'POST',
    url: '/auth/google-login',
    handler: fastify.loginWithGoogle, 
  });

   /**
   * [NEW] GET /auth/google (startRedirectPath)
   * Handled automatically by @fastify/oauth2 - no explicit route needed.
   * yet customizable...
   */

   fastify.route({
    method: 'GET',
    url: '/auth/google/callback',   
    handler: fastify.googleCallback,
  })

  // 1
  fastify.route({
    method: 'GET',
    url: '/',
    handler: async (request, reply) => {
      return 'hello eventstorm!';
    }
  });

  // 1
  fastify.route({
    method: 'GET',
    url: '/auth/disco',
    handler: fastify.readAllUsers,
  });  

  // 1
  fastify.route({
    method: 'POST',
    url: '/auth/register',
    schema: {
      body: fastify.getSchema('schema:auth:register'), 
    },
    handler: fastify.registerUser,
  });

  // 1
  fastify.route({
    method: 'POST',
    url: '/auth/remove',
    handler: fastify.removeUser,
  });

  // 1
  fastify.route({
    method: 'POST',
    url: '/auth/login',
    schema: {
      response: {
        200: fastify.getSchema('schema:auth:token'),
      },
    },
    handler: fastify.loginUser,
  });


  // 1
  fastify.route({
    method: 'GET',
    url: '/auth/me',
    schema: {
      headers: fastify.getSchema('schema:auth:token-header'),
      response: {
        200: fastify.getSchema('schema:user'),
      },
    },
    preValidation: [fastify.verifyToken],
    handler: fastify.getUserInfo,
  });

  // 1
  fastify.route({
    method: 'POST',
    url: '/auth/logout',
    preValidation: [fastify.verifyToken],
    handler: fastify.logoutUser,
  });

 // 1 
  fastify.route({
    method: 'POST',
    url: '/auth/refresh',
    schema: {
      headers: fastify.getSchema('schema:auth:token-header'),
      response: {
        200: fastify.getSchema('schema:auth:token'),
      },
    },
    preValidation: [fastify.verifyToken],
    handler: fastify.refreshToken,
  });

  // Privacy Policy Route
  fastify.get('/privacy', async (request, reply) => {
    reply.type('text/html').send(`
      <h1>Privacy Policy</h1>
      <p>This page is under construction. We will publish our final policy soon.</p>
    `);
  });

  // Terms of Service Route
  fastify.get('/terms', async (request, reply) => {
    reply.type('text/html').send(`
      <h1>Terms of Service</h1>
      <p>This page is under construction. We will publish our official terms soon.</p>
    `);
  });


});
