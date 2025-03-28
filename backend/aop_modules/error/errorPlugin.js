// errorPlugin.js
'use strict'
const fp = require('fastify-plugin')

module.exports = fp(function errorHandlerPlugin (fastify, opts, next) {
  fastify.setErrorHandler((err, req, reply) => {
    // Use the error's statusCode if available, or default to 500
    const statusCode = err.statusCode || 500
    reply.code(statusCode)
  
    if (statusCode >= 500) {
      req.log.error({ req, res: reply, err }, err?.message)
      return reply.send({
        error: 'Internal Server Error',
        message: `Fatal error. Contact the support team with the id ${req.id}`
      })
    }
  
    req.log.info({ req, res: reply, err }, err?.message)
    return reply.send(err)
  })
  next()
})
