'use strict'
// auth.js

const fp = require('fastify-plugin')
const fastifyJwt = require('@fastify/jwt')  
const { v4: uuidv4 } = require('uuid')

// eslint-disable-next-line no-unused-vars
module.exports = fp(async function authenticationPlugin (fastify, opts) {
  const revokedTokens = new Map()  

  fastify.register(fastifyJwt, {  
    secret: fastify.secrets.JWT_SECRET,
    jwtVerify: {
      requestProperty: 'jwtPayload', // Corrected option
    },
    trusted: function isTrusted (request, decodedToken) {
      return !revokedTokens.has(decodedToken.jti)
    }
  })

  fastify.decorate('verifyToken', async function (request, reply) {
    try {
      console.log('verifying token at auth.js/verifyToken')
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })
  
  fastify.decorateRequest('revokeToken', function () {  
    revokedTokens.set(this.jwtPayload.jti, true)
  })

  fastify.decorateRequest('generateToken', async function () {  
    const token = await fastify.jwt.sign({
      id: String(this.jwtPayload.id),
      username: this.jwtPayload.username
    }, {
      jwtid: uuidv4(),
      expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h'
    })

    return token
  })

})
