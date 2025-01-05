// authPlugin.js
'use strict'

const fp = require('fastify-plugin')
const fastifyJwt = require('@fastify/jwt')  
const { v4: uuidv4 } = require('uuid')

// eslint-disable-next-line no-unused-vars
module.exports = fp(async function authPlugin (fastify, opts) {
  
  console.log('authPlugin loaded!');
  
  const revokedTokens = new Map()  

  fastify.register(fastifyJwt, {  
    secret: fastify.secrets.JWT_SECRET,
    sign: {
      expiresIn: fastify.secrets.JWT_EXPIRE_IN 
    },
    verify: {
      requestProperty: 'user', // Changed from 'jwtPayload' to 'user'
    },
    trusted: function isTrusted (request, decodedToken) {
      return !revokedTokens.has(decodedToken.jti)
    }
  });
  

  fastify.decorate('verifyToken', async function (request, reply) {
    try {
      console.log('verifying token at auth.js/verifyToken')
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })
  
  fastify.decorateRequest('revokeToken', function () {
    console.log("this.user authPlugin: ", this.user);
    if (!this.user || !this.user.jti) {
      throw new Error('Missing jti in token');
    }
    revokedTokens.set(this.user.jti, true);
    console.log('Revoked token with jti:', this.user.jti);
  });
  
  

  fastify.decorateRequest('generateToken', async function () {  
    const token = await fastify.jwt.sign({
      id: String(this.user.id),
      username: this.user.username
    }, {
      jwtid: uuidv4(),
      expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h'
    })
  
    return token
  });

})
