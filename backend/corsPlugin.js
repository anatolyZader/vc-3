// corsPlugin.js
'use strict'

const fp = require('fastify-plugin')
const fastifyCors = require('@fastify/cors')

// eslint-disable-next-line no-unused-vars
module.exports = fp(async function corsPlugin (fastify, opts) {
  fastify.register(fastifyCors, {
    origin: true
  })
})
