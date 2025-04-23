// app.js
'use strict';
/* eslint-disable no-unused-vars */

const path = require('node:path');
const AutoLoad = require('@fastify/autoload');
const fastifySensible = require('@fastify/sensible');
const fastifyCookie = require('@fastify/cookie');
const fastifySession = require('@fastify/session');

const loggingPlugin = require('./aop_modules/log/plugins/logPlugin'); 
const schemaLoaderPlugin = require('./env_schemas/schemaLoaderPlugin');
const envPlugin = require('./envPlugin');
const diPlugin = require('./diPlugin');
const corsPlugin = require('./corsPlugin');

const fastifyRedis = require('@fastify/redis');
const connectRedisPkg = require('connect-redis')
console.dir(connectRedisPkg, { depth: null }) // <-- see exactly what shape the module is
const RedisStore = connectRedisPkg.default 
console.log('RedisStore:', RedisStore);
const redisPlugin = require('./redisPlugin');

const helmet = require('@fastify/helmet');
const fs = require('fs');
const fastifyJwt = require('@fastify/jwt');

const fastifyOAuth2 = require('@fastify/oauth2');
const { OAuth2Client } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid');

// TODO: fix cookies issue and move back to aop_modules
const authSchemasPlugin = require('./aop_modules/auth/plugins/authSchemasPlugin');
const { truncateSync } = require('node:fs');

// TODO: isolate service
// const userService = require('./aop_modules/auth/application/services/userService');


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

  // try {
  //   fastify.log.info('Attempting to register @fastify/redis plugin.');
  //   await fastify.register(fastifyRedis, { 
  //     client: redisClient 
  //   });  
  //   fastify.log.info('@fastify/redis plugin registered successfully.');
  // } catch (err) {
  //   fastify.log.error(`Failed to register @fastify/redis plugin: ${err.message}`);
  //   throw fastify.httpErrors.internalServerError(
  //     'Failed to register @fastify/redis plugin',
  //     { cause: err }
  //   );
  // }

  try {
    await fastify.register(fastifyCookie,  {
      secret: fastify.secrets.COOKIE_SECRET,
      parseOptions: {
        secure: true,
        httpOnly: true,
        sameSite: 'None',
      }
    },
    { 
      encapsulate: false 
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

  try {
    fastify.log.info('🔌 Registering Redis client plugin')
    await fastify.register(redisPlugin)
    fastify.log.info('✅ Redis client plugin registered successfully')
  } catch (err) {
    fastify.log.error({ err }, '❌ Failed to register Redis client plugin')
    // re-throw so the server won’t start in a broken state
    throw err
  }

  let redisStore
  try {
    fastify.log.info('🔌 Initializing RedisStore for session plugin')
    redisStore = new RedisStore({
      client: fastify.redis,
      // optional settings:
      prefix: 'sess:',                     // key namespace
      ttl:   fastify.secrets.SESSION_TTL,  // in seconds (falls back to cookie.expires or 86400)
      // disableTouch: false,
      // disableTTL:   false,
    })
    fastify.log.info('✅ RedisStore initialized')
  } catch (err) {
    fastify.log.error({ err }, '❌ Failed to initialize RedisStore')
    throw err
  }

  fastify.redis.on('error', (err) => {
    // either ignore specific codes…
    if (err.code === 'ETIMEDOUT') {
      fastify.log.warn({ err }, 'Redis timeout, will retry');
      return;
    }
    // …or log everything at a lower level instead of letting ioredis print it
    fastify.log.error({ err }, 'Redis client error');
  });

  fastify.log.info('⏳ Testing Redis connection with PING…')
  try {
    const pong = await fastify.redis.ping()
    fastify.log.info(`✅ Redis PING response: ${pong}`)
  } catch (err) {
    fastify.log.error(`❌ Redis PING failed: ${err.message}`)
  }

    // right after registration
  fastify.redis.on('error', err => {
    fastify.log.error({ err }, 'Redis connection error')
  })


  await fastify.register(fastifySession, {
    secret: fastify.secrets.SESSION_SECRET, 
    cookie: { 
      secure: true,  
      maxAge: 86400000,
      httpOnly: true,
      sameSite: 'None',
    },
    store: redisStore,
    saveUninitialized: false,
  });


  let googleCreds = null;

  if (fastify.secrets.GOOGLE_APPLICATION_CREDENTIALS) {
    const fullPath = path.resolve(fastify.secrets.GOOGLE_APPLICATION_CREDENTIALS);
    try {
      googleCreds = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (error) {
      console.error('Error reading Google credentials:', error);
    }
  } else {
    console.warn('No GOOGLE_APPLICATION_CREDENTIALS path found in fastify.secrets.');
  }
  if (!googleCreds || !googleCreds.web) {
    console.error('googleCreds or googleCreds.web is missing.');
    return;
  }

  const clientId = googleCreds.web.client_id;
  const clientSecret = googleCreds.web.client_secret;
  console.log('googleCreds:', googleCreds);

  let userService;
  try {
    userService = await fastify.diContainer.resolve('userService');
  } catch (error) {
    fastify.log.error('Error resolving userService:', error);
    throw fastify.httpErrors.internalServerError(
      'Failed to resolve userService. Ensure it is registered in the DI container.',
      { cause: error }
    );
  }

    // ----------------------------
  // JWT configuration
  // ----------------------------
  const revokedTokens = new Map();

  fastify.register(fastifyJwt, {
    secret: fastify.secrets.JWT_SECRET,
    sign: { expiresIn: fastify.secrets.JWT_EXPIRE_IN },
    verify: { requestProperty: 'user' },
    trusted: function isTrusted(request, decodedToken) {
      return !revokedTokens.has(decodedToken.jti);
    },
  });

  fastify.decorate('verifyToken', async function (request, reply) {
    let authToken = request.cookies && request.cookies.authToken;
    if (!authToken && request.headers.authorization) {
      const parts = request.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        authToken = parts[1];
      }
    }
    if (!authToken) {
      throw fastify.httpErrors.unauthorized('Missing token');
    }
    try {
      const decoded = await fastify.jwt.verify(authToken);
      request.user = decoded;
    } catch (err) {
      fastify.log.error('Token verification error:', err);
      throw fastify.httpErrors.unauthorized(err.message);
    }
  });

  fastify.decorateRequest('revokeToken', function () {
    if (!this.user || !this.user.jti) {
      throw this.httpErrors.unauthorized('Missing jti in token');
    }
    revokedTokens.set(this.user.jti, true);
  });

  fastify.decorateRequest('generateToken', async function () {
    const authToken = await fastify.jwt.sign(
      { id: String(this.user.id), username: this.user.username },
      {
        jwtid: uuidv4(),
        expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h',
      }
    );
    return authToken;
  });



  // OAUTH2

  fastify.register(fastifyOAuth2, {
    name: 'googleOAuth2',
    scope: ['profile', 'email', 'openid'],
    cookie: {
      secure: true,
      sameSite: 'None',
      httpOnly: true,
      allowCredentials: true,
    },
    credentials: {
      client: { id: clientId, secret: clientSecret },
      auth: fastifyOAuth2.GOOGLE_CONFIGURATION
    },
    startRedirectPath: '/auth/google',
    callbackUri: 'http://localhost:3000/auth/google/callback',
  },
  {
    encapsulate: false
  }
  
);  

  const googleClient = new OAuth2Client(clientId);
  fastify.decorate('verifyGoogleIdToken', async function (googleIdToken) {
    console.lohg('Verifying Google ID token:', googleIdToken);
    if (!googleIdToken) {
      throw new Error('Google ID token is required');
    }
    const ticket = await googleClient.verifyIdToken({
      idToken: googleIdToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    return payload;
  });
 
  await fastify.register(authSchemasPlugin);




  fastify.get('/auth/google/callback', async (req, reply) => {
    console.log('--- Incoming callback cookies ---', req.cookies);
    try {
      const token = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
      const googleAccessToken = token.token.access_token;
      // 1) Using that access token, fetch user info from Google
      const googleUser = await userService.loginWithGoogle(googleAccessToken);
      if (!googleUser) {
        return reply.unauthorized('Google profile invalid or not verified.');
      }

      // 2) Create a local JWT so that /auth/me can decode it
      const jti = uuidv4();
      const localJwt = fastify.jwt.sign({
        id: googleUser.id,
        username: googleUser.username,
        // any other fields
        jti
      }, {
        jwtid: jti,
        expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h'
      });
  
      // 3) Store the local JWT in the same cookie your manual flow uses
      reply.setCookie('authToken', localJwt, {
        path: '/',
        httpOnly: true,
        secure: true, // set true in production
        sameSite: 'None',

      });
  
      // 4) Redirect user to front-end
      reply.redirect('http://localhost:5173/chat');
  
    } catch (err) {
      console.error('Google OAuth callback error:', err);
      return reply.internalServerError('OAuth failed', { cause: err });
    }
  });
  
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

  fastify.get('/debug/clear-state-cookie', (req, reply) => {
    reply.clearCookie('oauth2-redirect-state', { path: '/' });
    reply.send({ message: 'cleared' });
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

