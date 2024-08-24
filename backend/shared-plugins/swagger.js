'use strict'

const fp = require('fastify-plugin')
const fastifySwagger = require('@fastify/swagger')
const pkg = require('../package.json')

// eslint-disable-next-line no-unused-vars
module.exports = fp(async function swaggerPlugin (fastify, opts) {
  fastify.register(fastifySwagger, {
    routePrefix: '/docs',
    exposeRoute: fastify.secrets.NODE_ENV !== 'production',
    swagger: {
      info: {
        title: 'vc-app',
        description: 'destructure the educational videos to atoms',
        version: pkg.version
      }
    }
  })
})