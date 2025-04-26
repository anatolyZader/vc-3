// app.js
'use strict'
/* eslint-disable no-unused-vars */

const path = require('node:path')
const AutoLoad = require('@fastify/autoload')
const fastifySensible = require('@fastify/sensible')
const fastifyCookie = require('@fastify/cookie')
const fastifySession = require('@fastify/session')

const loggingPlugin = require('./aop_modules/log/plugins/logPlugin')
const schemaLoaderPlugin = require('./env_schemas/schemaLoaderPlugin')
const envPlugin = require('./envPlugin')
const diPlugin = require('./diPlugin')
const corsPlugin = require('./corsPlugin')

const redisPlugin = require('./redisPlugin')

const helmet = require('@fastify/helmet')
const fs = require('fs')
const fastifyJwt = require('@fastify/jwt')
const fastifyOAuth2 = require('@fastify/oauth2')
const { OAuth2Client } = require('google-auth-library')
const { v4: uuidv4 } = require('uuid')

// remove connect-redis, use @fastify/session's RedisStore
const { RedisStore } = require('@fastify/session')
const authSchemasPlugin = require('./aop_modules/auth/plugins/authSchemasPlugin')

require('dotenv').config()

module.exports = async function (fastify, opts) {
  await fastify.register(loggingPlugin)
  await fastify.register(schemaLoaderPlugin)
  await fastify.register(envPlugin)
  await fastify.register(diPlugin)
  await fastify.register(fastifySensible)
  await fastify.register(helmet, {
    global: true,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", 'https://accounts.google.com/gsi/'],
        scriptSrc: ["'self'", 'https://accounts.google.com/gsi/client'],
        styleSrc: ["'self'", 'https://accounts.google.com/gsi/style'],
        frameSrc: ["'self'", 'https://accounts.google.com/gsi/'],
        connectSrc: ["'self'", 'https://accounts.google.com/gsi/']
      }
    }
  })
  await fastify.register(corsPlugin)

  // register Redis client
  fastify.log.info('🔌 Registering Redis client plugin')
  await fastify.register(redisPlugin)
  fastify.log.info('✅ Redis client plugin registered')

  // listen for errors on the client
  fastify.redis.on('error', err => {
    fastify.log.error({ err }, 'Redis client error')
  })

  // test connection
  fastify.log.info('⏳ Testing Redis connection with PING…')
  try {
    const pong = await fastify.redis.ping()
    fastify.log.info(`✅ Redis PING response: ${pong}`)
  } catch (err) {
    fastify.log.error({ err }, '❌ Redis PING failed')
  }

  // Cookie
  await fastify.register(fastifyCookie, {
    secret: fastify.secrets.COOKIE_SECRET,
    parseOptions: {
      secure: true,
      httpOnly: true,
      sameSite: 'None',
    }
  }, { encapsulate: false })
  fastify.log.info('Cookie package successfully registered')

  // Session with native RedisStore
  await fastify.register(fastifySession, {
    secret: fastify.secrets.SESSION_SECRET,
    cookie: {
      secure: true,
      maxAge: 86400000,
      httpOnly: true,
      sameSite: 'None'
    },
    store: new RedisStore({
      sendCommand: (...args) => fastify.redis.sendCommand(args)
    }),
    saveUninitialized: false
  })
  fastify.log.info('Session plugin registered with RedisStore')

  // ... the rest of your plugin registrations and route setup remains unchanged

  // OAUTH2, JWT, other routes, autoload, hooks etc.
  // (unchanged)
}
