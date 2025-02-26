'use strict';
/* eslint-disable no-unused-vars */

const path = require('node:path');
const AutoLoad = require('@fastify/autoload');
const fastifySensible = require('@fastify/sensible');
const fastifyCookie = require('@fastify/cookie');
const fastifySession = require('@fastify/session');
const RedisStore = require('connect-redis').default;
const redisClient = require('./redisClient');
const redisStore = new RedisStore({ client: redisClient });  
// const logOptions = require('./aop/log/logPlugin');
const loggingPlugin = require('./aop_modules/log/plugins/logPlugin'); 
const schemaLoaderPlugin = require('./env_schemas/schemaLoaderPlugin');
const envPlugin = require('./envPlugin');
const diPlugin = require('./diPlugin');
const corsPlugin = require('./corsPlugin');
const fastifyRedis = require('@fastify/redis');
const helmet = require('@fastify/helmet');
const websocket = require('@fastify/websocket');


require('dotenv').config();

module.exports = async function (fastify, opts) {
  await fastify.register(loggingPlugin);
  await fastify.register(schemaLoaderPlugin);
  await fastify.register(envPlugin);
  await fastify.register(diPlugin);
  await fastify.register(fastifySensible);
  await fastify.register(helmet, { global: true });
  await fastify.register(corsPlugin);
  await fastify.register(websocket);

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
    dir: path.join(__dirname, 'aop'),
    options: Object.assign({}, opts),
    encapsulate: true,
    maxDepth:1,
    dirNameRoutePrefix: false,
  });

  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'modules'),
    options: Object.assign({}, opts),
    encapsulate: true,
    maxDepth: 1,
    dirNameRoutePrefix: false,
    ignorePattern: /video_module/
    });

};

