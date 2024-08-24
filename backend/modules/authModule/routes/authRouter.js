/* eslint-disable no-unused-vars */
// authRouter.js
'use strict'

const fp = require('fastify-plugin')

module.exports.prefixOverride = '' // expose the routes directly on the root path 
module.exports = fp(
  async function authRouter (fastify, opts) {


  const registerSchemaBody = fastify.getSchema('schema:auth:register')
  console.log('Schema for "schema:auth:register retreived at authRouter.js":', registerSchemaBody); 


    fastify.route({
    method: 'POST',
    url: '/register',
    handler: fastify.registerUser
    });

    fastify.route({
      method: 'POST',
      url: '/authenticate',
      handler: fastify.authenticateUser
    })
  
    fastify.route({
      method: 'POST',
      url: '/refresh',
      onRequest: fastify.authenticate,      
      handler: fastify.refreshToken
    })

    fastify.route({
      method: 'GET',
      url: '/me',
      onRequest: fastify.authenticate,
      handler: fastify.getMe
    })

    fastify.route({
      method: 'POST',
      url: '/logout',
      onRequest: fastify.authenticate,
      handler: fastify.logoutUser
  })
  });