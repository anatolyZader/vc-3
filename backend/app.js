// app.js
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
const loggingPlugin = require('./aop_modules/log/plugins/logPlugin'); 
const schemaLoaderPlugin = require('./env_schemas/schemaLoaderPlugin');
const envPlugin = require('./envPlugin');
const diPlugin = require('./diPlugin');
const corsPlugin = require('./corsPlugin');
const fastifyRedis = require('@fastify/redis');
const helmet = require('@fastify/helmet');
const fs = require('fs');

const fastifyOAuth2 = require('@fastify/oauth2');
const { OAuth2Client } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid');

// TODO: fix cookies issue and move back to aop_modules
const authPlugin = require('./aop_modules/auth/plugins/authPlugin');
const authSchemasPlugin = require('./aop_modules/auth/plugins/authSchemasPlugin');
const { truncateSync } = require('node:fs');


require('dotenv').config();

module.exports = async function (fastify, opts) {
  await fastify.register(loggingPlugin);
  await fastify.register(schemaLoaderPlugin);
  await fastify.register(envPlugin);
  await fastify.register(diPlugin);
  await fastify.register(fastifySensible);
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
  }}); 
  await fastify.register(corsPlugin);

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
      parseOptions: {
        secure: false,
        httpOnly: true,
        sameSite: 'none',
      },
    });
    
    console.log('Cookie package successfully registered');
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


 



  await fastify.register(authPlugin, opts, { encapsulate: false }); // force shared scope

  await fastify.register(authSchemasPlugin);


  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'aop_modules'),
    options: Object.assign({}, opts),
    encapsulate: false,
    maxDepth: 1,
    dirNameRoutePrefix: false,
  });

  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'business_modules'),
    options: Object.assign({}, opts),
    encapsulate: true,
    maxDepth: 1,
    dirNameRoutePrefix: false,
  });

  fastify.get('/debug-reply', (request, reply) => {
    // Log the properties of the reply instance's prototype
    const proto = Object.getPrototypeOf(reply);
    console.log('Reply prototype methods:', Object.getOwnPropertyNames(proto));
    reply.send({ status: 'ok' });
  });
  

  // , { prefix: 'v1' } 

  fastify.addHook('onReady', async () => {
    console.log('Available fastify methods:');
    console.log(Object.keys(fastify));
  
    const Reply = fastify[Symbol.for('fastify.Reply')];
    const replyProto = Reply?.prototype || fastify.Reply?.prototype;
  
    if (replyProto) {
      console.log('--- Reply prototype keys (including from @fastify/cookie):');
      console.log(Object.getOwnPropertyNames(replyProto));
    } else {
      console.warn('Reply prototype not found');
    }
  });
  


};

