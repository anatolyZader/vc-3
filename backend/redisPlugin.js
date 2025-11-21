// redisPlugin
'use strict'

const fp = require('fastify-plugin')
const fastifyRedis = require('@fastify/redis')

async function redisPlugin (fastify, opts) {

  fastify.log.debug('Registering Redis client with REDIS_HOST: ', fastify.secrets.REDIS_HOST)

  const redisOpts = {
    host: fastify.secrets.REDIS_HOST,
    port: fastify.secrets.REDIS_PORT,
    connectionTimeout: opts.connectionTimeout ?? 1000, // how long (in milliseconds) the client will wait when trying to establish a connection before giving up.
    lazyConnect: true, //If true, the Redis client will not connect automatically on instantiation. Instead, you must explicitly call .connect() to initiate the connection.
    timeout: 1000 // Sets the socket timeout for network operations (in milliseconds). If any Redis operation takes longer than this, it will fail with a timeout error.
  }

  fastify.log.info({ redisOpts }, 'About to register @fastify/redis');

  await fastify.register(fastifyRedis, redisOpts)
  // afterwards: fastify.redis.get(...), fastify.redis.set(...)
}

module.exports = fp(redisPlugin, {
  name: 'redis-client'
})
