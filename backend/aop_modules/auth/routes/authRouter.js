'use strict';
/* eslint-disable no-unused-vars */
// authRouter.js
const fp = require('fastify-plugin');

module.exports = fp(async function authRouter(fastify, opts) {

  console.log('authRouter is loaded!');

  // 11
  // fastify.route({
  //   method: 'GET',
  //   url: '/',
  //   handler: async (request, reply) => {
  //     return 'hello eventstorm api!';
  //   }
  // });

  // 1
  fastify.route({
    method: 'GET',
    url: '/api/auth/disco',
    handler: fastify.readAllUsers,
  });  

  // 1
  fastify.route({
    method: 'POST',
    url: '/api/auth/register',
    schema: {
      body: fastify.getSchema('schema:auth:register'), 
    },
    handler: fastify.registerUser,
  });

  // 1
  fastify.route({
    method: 'POST',
    url: '/api/auth/remove',
    handler: fastify.removeUser,
  });

  // 1
  fastify.route({
    method: 'POST',
    url: '/api/auth/login',
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
    url: '/api/auth/me',
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
    url: '/api/auth/logout',
    preValidation: [fastify.verifyToken],
    handler: fastify.logoutUser,
  });

 // 1 
  fastify.route({
    method: 'POST',
    url: '/api/auth/refresh',
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
  fastify.get('/api/privacy', async (request, reply) => {
    reply.type('text/html').send(`
      <h1>Privacy Policy</h1>
      <p>This page is under construction. We will publish our final policy soon.</p>
    `);
  });

  // Terms of Service Route
  fastify.get('/api/terms', async (request, reply) => {
    reply.type('text/html').send(`
      <h1>Terms of Service</h1>
      <p>This page is under construction. We will publish our official terms soon.</p>
    `);
  });

});
