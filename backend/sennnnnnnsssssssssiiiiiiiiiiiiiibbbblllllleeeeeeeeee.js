'use strict';

const path = require('node:path');
const AutoLoad = require('@fastify/autoload');
const fastifyCookie = require('@fastify/cookie');
const fastifySession = require('@fastify/session');
const RedisStore = require('connect-redis').default;
const redisClient = require('./redisClient');
const redisStore = new RedisStore({ client: redisClient });  
const logOptions = require('./aop/log/logPlugin');
const loggingPlugin = require('./aop/log/logPlugin'); 
const schemaLoaderPlugin = require('./env_schemas/schemaLoaderPlugin');
const envPlugin = require('./envPlugin');
const fastifyRedis = require('@fastify/redis');

require('dotenv').config();

module.exports = async function (fastify, opts) {
  await fastify.register(loggingPlugin);
  await fastify.register(schemaLoaderPlugin);
  await fastify.register(envPlugin);

  try {
    fastify.log.info('Attempting to register @fastify/redis plugin.');
    await fastify.register(fastifyRedis, { 
      client: redisClient 
    });  
    fastify.log.info('@fastify/redis plugin registered successfully.');
  } catch (err) {
    fastify.log.error(`Failed to register @fastify/redis plugin: ${err.message}`);
    throw fastify.httpErrors.internalServerError(
      'Failed to register @fastify/redis plugin',
      { cause: err }
    );
  }

  try {
    await fastify.register(fastifyCookie, {
      secret: fastify.secrets.COOKIE_SECRET,
      parseOptions: {},
      cookie: {
        secure: true, 
        httpOnly: true,
        sameSite: 'strict',
      },
    });
    console.log('Cookie plugin successfully registered');
  } catch (error) {
    console.error('Error registering @fastify/cookie:', error);
    // Replaced silent swallow with @fastify/sensible
    throw fastify.httpErrors.internalServerError(
      'Error registering @fastify/cookie',
      { cause: error }
    );
  }

  await fastify.register(fastifySession, {
    secret: fastify.secrets.SESSION_SECRET, 
    cookie: { 
      secure: true,  
      maxAge: 86400000,
      httpOnly: true,
      sameSite: 'strict',
    },
    store: redisStore,
    saveUninitialized: false,
  });

  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'shared-plugins'),
    options: Object.assign({}, opts),
    encapsulate: false,
    maxDepth: 1,
    ignore: ['envPlugin.js'],
  });

  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'aop'),
    options: Object.assign({}, opts),
    encapsulate: false,
    maxDepth: 1,
  });

  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'modules'),
    options: Object.assign({}, opts),
    encapsulate: false,
    maxDepth: 1,
    matchFilter: (path) => path.includes('Controller') || path.includes('Plugin') || path.includes('Router')
  });

  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'doc'),
    options: Object.assign({}, opts),
    encapsulate: false,
    maxDepth: 4,
    matchFilter: (path) => path.includes('Plugin')
  });

  await fastify.setErrorHandler(async (err, request, reply) => {
    if (err.validation) {
      // Replaced reply code with @fastify/sensible equivalent
      throw fastify.httpErrors.forbidden(err.message, { cause: err });
    }
    request.log.error({ err });
    // Replaced generic reply with @fastify/sensible equivalent
    throw fastify.httpErrors.internalServerError(
      "I'm sorry, there was an error processing your request.",
      { cause: err }
    );
  });

  fastify.setNotFoundHandler(async (request, reply) => {
    // Replaced reply code with @fastify/sensible equivalent
    throw fastify.httpErrors.notFound(
      "I'm sorry, I couldn't find what you were looking for."
    );
  });
};
