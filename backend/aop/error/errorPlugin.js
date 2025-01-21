// errorPlugin.js
'use strict'

const fp = require('fastify-plugin')

module.exports = fp(function errorHandlerPlugin (fastify, opts, next) {
  fastify.setErrorHandler((err, req, reply) => {
    if (reply.statusCode >= 500) {
      req.log.error({ req, res: reply, err }, err?.message)
      return reply.internalServerError(
        `Fatal error. Contact the support team with the id ${req.id}`,
        { cause: err }
      )
    }
    req.log.info({ req, res: reply, err }, err?.message)
    return reply.send(err)
  })
  next()
})
