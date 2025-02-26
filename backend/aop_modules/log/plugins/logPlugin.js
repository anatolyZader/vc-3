// aop/log/plugins/logPlugin.js
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
  fastify.setErrorHandler(async (err, request, reply) => {
    // If this is a validation error
    if (err.validation) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: err.message
      });
    }
  
    // If this is a 404 error
    if (err.statusCode === 404) {
      return reply.status(404).send({
        error: 'Not Found',
        message: err.message
      });
    }
  
    // Otherwise, handle as 500
    request.log.error(err);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Oops...'
    });
  });

   // NotFound handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: 'Not Found',
      message: "I'm sorry, I couldn't find what you were looking for.",
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
