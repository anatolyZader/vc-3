'use strict'

const fp = require('fastify-plugin')
const fastifyJwt = require('@fastify/jwt') // [1]

// eslint-disable-next-line no-unused-vars
module.exports = fp(async function authenticationPlugin (fastify, opts) {
  const revokedTokens = new Map() // [2]

  fastify.register(fastifyJwt, { // [3]
    secret: fastify.secrets.JWT_SECRET,
    trusted: function isTrusted (request, decodedToken) {
      return !revokedTokens.has(decodedToken.jti)
    }
  })


})
