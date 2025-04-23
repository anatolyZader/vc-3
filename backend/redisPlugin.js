// redisPlugin
'use strict'

const fp = require('fastify-plugin')
const fastifyRedis = require('@fastify/redis')

async function redisPlugin (fastify, opts) {
  const redisOpts = {
    host: fastify.secrets.REDIS_HOST,
    port: fastify.secrets.REDIS_PORT,
    connectionTimeout: opts.connectionTimeout ?? 1000,

  }

  fastify.log.debug({ redisOpts }, 'Registering Redis client')
  await fastify.register(fastifyRedis, redisOpts)
  // afterwards: fastify.redis.get(...), fastify.redis.set(...)
}

module.exports = fp(redisPlugin, {
  name: 'redis-client',
  // optionally declare dependencies if this plugin must load after others:
  // dependencies: ['some-other-plugin']
})
