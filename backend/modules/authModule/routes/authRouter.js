/* eslint-disable no-unused-vars */
// authRouter.js
'use strict'

const fp = require('fastify-plugin')

module.exports.prefixOverride = '' // expose the routes directly on the root path 
module.exports = fp(
  async function authRouter (fastify, opts) {

    const registerSchemaBody = fastify.getSchema('schema:auth:register')
    console.log('Schema for "schema:auth:register retreived at authRouter.js":', registerSchemaBody); 

    fastify.get('/testo', async (request, reply) => {
      request.log.info('Received request from:', request.headers['user-agent']);
      reply
        .type('application/json')
        .send({ hello: 'testo!' });
    });

    fastify.route({
    method: 'POST',
    url: '/register',
    handler: fastify.registerUser
    });

    fastify.route({
      method: 'POST',
      url: '/authenticate',
      handler: fastify.loginUser
    })
  
    fastify.route({
      method: 'POST',
      url: '/refresh',
      onRequest: fastify.verifyToken,      
      handler: fastify.refreshToken
    })

    fastify.route({
      method: 'GET',
      url: '/me',
      onRequest: fastify.verifyToken,
      handler: fastify.getMe
    })

    fastify.route({
      method: 'POST',
      url: '/logout',
      onRequest: fastify.verifyToken,
      handler: fastify.logoutUser
  })
  });