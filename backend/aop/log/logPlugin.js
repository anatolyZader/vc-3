// loggingPlugin.js
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
      // responseTime: reply.getResponseTime(),
      user: request.user ? { id: request.user.id, role: request.user.role } : undefined,
      headers: reply.getHeaders(),
    };
    fastify.log.info(enrichedLog, 'Request completed');
  });

  fastify.setErrorHandler((error, request, reply) => {
    const enrichedErrorLog = {
      reqId: request.id,
      method: request.method,
      url: request.raw.url,
      routeUrl: request.routerPath,
      user: request.user ? { id: request.user.id, role: request.user.role } : undefined,
      error: {
        message: error.message,
        stack: error.stack,
      }
    };
    fastify.log.error(enrichedErrorLog, 'Error occurred during request');
    return reply.internalServerError(error.message, { cause: error }); 
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
        query: request.query, // Log query parameters
        params: request.params, // Log route parameters
        body: shouldLogBody ? request.body : undefined, // Log request body if allowed
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
