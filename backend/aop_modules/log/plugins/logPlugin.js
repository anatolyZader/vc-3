// logPlugin.js
'use strict';
const fp = require('fastify-plugin');

async function logPlugin(fastify, opts) {
  fastify.log.info('Logging plugin registered');
  console.log('logPlugin opts: ', opts); 

  fastify.addHook('onResponse', async (request, reply) => {
    const enrichedLog = {
      reqId: request.id,
      method: request.method,
      url: request.raw.url,
      routeUrl: request.routerPath,
      query: request.query,
      params: request.params,
      statusCode: reply.statusCode,
      user: request.user ? { id: request.user.id, role: request.user.role } : undefined,
      headers: reply.getHeaders(),
    };
    fastify.log.info(enrichedLog, 'Request completed');
  });

  fastify.setErrorHandler(async (err, request, reply) => {
    // If this is a validation error, handle as 403
    if (err.validation) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: err.message
      });
    }
  
    // Iff this is a 404 error, handle as 404
    if (err.statusCode === 404) {
      return reply.status(404).send({
        error: 'Not Found',
        message: err.message
      });
    }
  
    // For all other errors, use the error's statusCode if set, else default to 500
    const statusCode = err.statusCode || 500;
    reply.code(statusCode);
  
    request.log.error(err);
    return reply.send({
      error: statusCode >= 500 ? 'Internal Server Error' : err.error || 'Error',
      message: err.message
    });
  });
}

const logOptions = {
  disableRequestLogging: true,
  requestIdLogLabel: false,
  requestIdHeader: 'x-request-id',
  level: process.env.LOG_LEVEL || 'debug',
  timestamp: () => {
    const dateString = new Date(Date.now()).toISOString();
    return `,"@timestamp":"${dateString}"`;
  },
  redact: {
    censor: '***',
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.email'
    ]
  },
  serializers: {
    req: function (request) {
      const shouldLogBody = request.context.config?.logBody === true;
      return {
        method: request.method,
        url: request.raw.url,
        routeUrl: request.routerPath,
        version: request.headers?.['accept-version'],
        user: request.user?.id,
        headers: request.headers,
        query: request.query,  
        params: request.params,  
        body: shouldLogBody ? request.body : undefined, 
        hostname: request.hostname,
        remoteAddress: request.ip,
        remotePort: request.socket?.remotePort
      };
    },
    res: function (reply) {
      return {
        statusCode: reply.statusCode,
        responseTime: reply.getResponseTime(),
        headers: reply.getHeaders(), 
      };
    }
  }
};

module.exports = fp(logPlugin);
module.exports.logOptions = logOptions;
