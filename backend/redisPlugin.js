// redisPlugin
'use strict'

const fp = require('fastify-plugin')
const fastifyRedis = require('@fastify/redis')

async function redisPlugin (fastify, opts) {
  fastify.log.info('Registering Redis client with REDIS_HOST:', fastify.secrets.REDIS_HOST);

  if (!fastify.secrets.REDIS_HOST) {
    throw new Error('REDIS_HOST is required but not configured');
  }

  const redisOpts = {
    host: fastify.secrets.REDIS_HOST,
    port: fastify.secrets.REDIS_PORT || 6379,
    password: fastify.secrets.REDIS_SECRET, // Redis authentication password
    connectTimeout: opts.connectTimeout ?? 10000, // Increased timeout for Cloud Run
    lazyConnect: true, // Don't connect immediately
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    retryConnectOnFailure: true,
    keepAlive: 30000
  }

  fastify.log.info({ redisOpts }, 'About to register @fastify/redis');

  await fastify.register(fastifyRedis, redisOpts);
  fastify.log.info('✅ Redis plugin registered successfully');
  // afterwards: fastify.redis.get(...), fastify.redis.set(...)
}

module.exports = fp(redisPlugin, {
  name: 'redis-client'
})
