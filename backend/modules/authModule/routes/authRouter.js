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
      method: 'GET',
      url: '/disco',
      handler: fastify.discoverUsers
    })

    fastify.route({
      method: 'POST',
      url: '/register',
      handler: fastify.registerUser
      });

    fastify.route({
      method: 'POST',
      url: '/login',
      handler: fastify.loginUser
    })  
    



    
// -----------------------------------------------------------------------------------
// TO FIX :

    fastify.route({
      method: 'GET',
      url: '/me',
      onRequest: fastify.verifyToken,
      handler: fastify.getMe
    })
    

    fastify.route({
      method: 'POST',
      url: '/refresh',
      onRequest: fastify.verifyToken,      
      handler: fastify.refreshToken
    })



    fastify.route({
      method: 'POST',
      url: '/logout',
      onRequest: fastify.verifyToken,
      handler: fastify.logoutUser
  })
  });