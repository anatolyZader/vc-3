/* eslint-disable no-unused-vars */
// loader.js
'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function schemaLoaderPlugin (fastify, opts) {
  fastify.addSchema(require('../routes/schemas/register.json'))
  fastify.addSchema(require('../routes/schemas/token-header.json'))
  fastify.addSchema(require('../routes/schemas/token.json'))
  fastify.addSchema(require('../routes/schemas/user.json'))
})
