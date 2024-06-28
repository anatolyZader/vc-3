/* eslint-disable no-unused-vars */
// authRouter.js
'use strict'

const fp = require('fastify-plugin')

module.exports.prefixOverride = '' // expose the routes directly on the root path 
module.exports = fp(
  async function applicationAuth (fastify, opts) {
    fastify.post('/register', {  
      schema: {
        body: fastify.getSchema('schema:auth:register')  
      },
      handler: async function registerHandler (request, reply) {
        const existingUser = await fastify.readUser(request.body.userId)  
        if (existingUser) {  
          const err = new Error('User already registered')
          err.statusCode = 409
          throw err
        }
        try {
          const newUserId = await fastify.registerUser({  
            username: request.body.username,
            password: request.body.password // store plain text password
          })
          request.log.info({ userId: newUserId }, 'User registered')

          reply.code(201)
          return { registered: true } 
        } catch (error) {
          request.log.error(error, 'Failed to register user')
          reply.code(500)
          return { registered: false } 
        }
      }
    })

    fastify.post('/authenticate', {
      schema: {  
        body: fastify.getSchema('schema:auth:register'),
        response: {
          200: fastify.getSchema('schema:auth:token')
        }
      },
      handler: async function authenticateHandler (request, reply) {
        const user = await this.usersDataSource.readUser(request.body.username) 

        if (!user || user.password !== request.body.password) { 
          const err = new Error('Wrong credentials provided')
          err.statusCode = 401
          throw err
        }

        request.user = user 
        return refreshHandler(request, reply) 
      }
    })

    fastify.get('/me', {
      onRequest: fastify.authenticate,
      schema: {
        headers: fastify.getSchema('schema:auth:token-header'),
        response: {
          200: fastify.getSchema('schema:user')
        }
      },
      handler: async function meHandler (request, reply) {
        return request.user
      }
    })

    fastify.post('/refresh', {
      onRequest: fastify.authenticate, 
      schema: {
        headers: fastify.getSchema('schema:auth:token-header'),
        response: {
          200: fastify.getSchema('schema:auth:token')
        }
      },
      handler: refreshHandler 
    })

    async function refreshHandler (request, reply) {
      const token = await request.generateToken() 
      return { token }
    }

    fastify.post('/logout', {
      onRequest: fastify.authenticate, 
      handler: async function logoutHandler (request, reply) {
        request.revokeToken() 
        reply.code(204)
      }
    })
  }
)
