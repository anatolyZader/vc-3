// errorPlugin.js

'use strict'
const fp = require('fastify-plugin')

module.exports = fp(function errorHandlerPlugin (fastify, opts, next) {
  fastify.setErrorHandler((err, req, reply) => {
    // 1) Decide on the HTTP status code
    const statusCode = err.statusCode || err.status || 500
    reply.code(statusCode)

    // 2) Log with the right level
    if (statusCode >= 500) {
      req.log.error({ err, url: req.raw.url, reqId: req.id }, err.message)
      return reply.send({
        statusCode,                    // ← required by your schema
        error: 'Internal Server Error',
        message: `Fatal error. Contact support with id ${req.id}`
      })
    } else {
      req.log.info({ err, url: req.raw.url, reqId: req.id }, err.message)
    }

    // 3) Validation errors (from fastify-schema) should be 400
    if (err.validation) {
      return reply.send({
        statusCode: 400,
        error: 'Bad Request',
        message: err.message
      })
    }

    // 4) Known HTTP errors (e.g. 401, 404) keep their name/message
    return reply.send({
      statusCode,                    // ← required!
      error:      err.name  || 'Error',
      message:    err.message || 'An error occurred'
      // (we no longer spread `...err`, to avoid accidentally serializing
      // buffers, circular refs, or private properties)
    })
  })

  next()
})
