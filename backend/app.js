// app.js
'use strict';
/* eslint-disable no-unused-vars */

const path = require('node:path');
const AutoLoad = require('@fastify/autoload');
const fastifySensible = require('@fastify/sensible');

const fastifyCookie = require('@fastify/cookie');
const fastifySession = require('@fastify/session');
const redisPlugin = require('./redisPlugin');
const { Store } = fastifySession;

const loggingPlugin = require('./aop_modules/log/plugins/logPlugin'); 
const schemaLoaderPlugin = require('./env_schemas/schemaLoaderPlugin');
const envPlugin = require('./envPlugin');
const diPlugin = require('./diPlugin');
const corsPlugin = require('./corsPlugin');
const helmet = require('@fastify/helmet');
const fs = require('fs');
const fastifyJwt = require('@fastify/jwt');
const fastifyOAuth2 = require('@fastify/oauth2');
const { OAuth2Client } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid');
const authSchemasPlugin = require('./aop_modules/auth/plugins/authSchemasPlugin');

require('dotenv').config();

module.exports = async function (fastify, opts) {

  fastify.addHook('onRoute', routeOptions => {
    fastify.log.info(
      { method: routeOptions.method, url: routeOptions.url },
      'route registered'
    );
  });
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

    fastify.log.info('🔌 Registering Redis client plugin')
    await fastify.register(redisPlugin)
    fastify.log.info('✅ Redis client plugin registered')
    fastify.redis.on('error', err => {
      fastify.log.error({ err }, 'Redis client error')
    })
    fastify.log.info('⏳ Testing Redis connection with PING…')
    try {
      const pong = await fastify.redis.ping()
      fastify.log.info(`✅ Redis PING response: ${pong}`)
    } catch (err) {
      fastify.log.error({ err }, '❌ Redis PING failed')
    }

    fastify.log.info('✅ ✅ 23.5 11:13 ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅   REVISED IMAGE')

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

  fastify.log.info('About to instantiate RedisStore…')
  class RedisStore extends Store {
    constructor(sendCommand) {
      super()
      this.send = sendCommand
    }

    get(sid, callback) {
      this.send(['GET', sid])
        .then(data => callback(null, data ? JSON.parse(data) : null))
        .catch(err  => callback(err))
    }

    set(sid, sess, ttlMs, callback) {
      const sessStr = JSON.stringify(sess)
      const ttl = typeof ttlMs === 'number'
        ? Math.ceil(ttlMs / 1000)
        : undefined

      const cmd = ttl
        ? ['SETEX', sid, ttl, sessStr]
        : ['SET', sid, sessStr]

      this.send(cmd)
        .then(() => callback(null))
        .catch(err => callback(err))
    }

  destroy(sid, callback) {
    this.send(['DEL', sid])
      .then(() => callback(null))
      .catch(err => callback(err))
  }};

  await fastify.register(fastifySession, {
    secret: fastify.secrets.SESSION_SECRET, 
    cookie: { 
      secure: true,  
      maxAge: 86400000,
      httpOnly: true,
      sameSite: 'None',
    },
    // store: redisStore,
    // store: new RedisStore({
    //   sendCommand: (...args) => fastify.redis.sendCommand(args)
    // }),
    store: new RedisStore(fastify.redis.sendCommand.bind(fastify.redis)),
    saveUninitialized: false,
  });

  // Health Check Route: Registered directly on the main Fastify instance.
  // This will be accessible at the root path: '/'
  fastify.get('/', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // For HEAD requests (often used by load balancers for health checks)
  // fastify.head('/', async (request, reply) => {
  //   reply.code(200).send();
  // });

  const fs = require('node:fs/promises');

  let credentialsJsonString, clientId, clientSecret;

  // 1. **Prioritize process.env for Cloud Run (where it contains the JSON string)**
  if (process.env.USER_OAUTH2_CREDENTIALS && process.env.USER_OAUTH2_CREDENTIALS.startsWith('{')) {
    // This branch is for Cloud Run (or any environment where the env var contains the JSON string)
    console.log('accessed process.env.USER_OAUTH2_CREDENTIALS (direct JSON) for auth');
    try {
      credentialsJsonString = JSON.parse(process.env.USER_OAUTH2_CREDENTIALS);
    } catch (error) {
      console.error('Error parsing Google credentials from process.env.USER_OAUTH2_CREDENTIALS:', error);
      throw fastify.httpErrors.internalServerError('Failed to parse Google OAuth2 credentials from environment variable. Invalid JSON.', { cause: error });
    }
  }
  // 2. **Fallback to fastify.secrets for Development VM (where it contains a file path)**
  else if (fastify.secrets && typeof fastify.secrets.USER_OAUTH2_CREDENTIALS === 'string') {
    // This branch is for the development VM where fastify.secrets provides a file path
    // We check for any string in fastify.secrets.USER_OAUTH2_CREDENTIALS,
    // assuming if it's there and the env var wasn't JSON, it must be a path.
    console.log('accessed fastify secrets (file path) for auth');
    const credentialsPath = fastify.secrets.USER_OAUTH2_CREDENTIALS;
    console.log('XXX credentialsPath:', credentialsPath);
    try {
      credentialsJsonString = JSON.parse(await fs.readFile(credentialsPath, { encoding: 'utf8' }));
    } catch (error) {
      console.error('Error reading Google credentials file from fastify.secrets:', error);
      throw fastify.httpErrors.internalServerError('Failed to read Google OAuth2 credentials file.', { cause: error });
    }
  }
  // 3. **Final Fallback if no credentials are found at all**
  else {
    fastify.log.warn('No USER_OAUTH2_CREDENTIALS secret/env var or fastify.secrets path provided for OAuth2 client setup. Proceeding without it, or using fallback.');
    clientId = process.env.FALLBACK_CLIENT_ID; // Or throw if mandatory
    clientSecret = process.env.FALLBACK_CLIENT_SECRET; // Or throw if mandatory
  }
    
  console.log(' credentialsJsonString accessed in google run:', credentialsJsonString);

  if (credentialsJsonString) {
      try {
          // googleCreds = JSON.parse(credentialsJsonString);
          clientId = credentialsJsonString.web.client_id;
          clientSecret =credentialsJsonString.web.client_secret;
          fastify.log.info('Loaded Google OAuth2 credentials from environment variable/secret.');
      } catch (err) {
          // This catch will now only trigger if the JSON string itself is malformed.
          throw fastify.httpErrors.internalServerError('Failed to parse Google OAuth2 credentials from environment variable/secret. Invalid JSON.', { cause: err });
      }
  } else {
      fastify.log.info('No USER_OAUTH2_CREDENTIALS secret/env var provided for OAuth2 client setup. Proceeding without it, or using fallback.');
      // If you need clientId/clientSecret for *all* environments, even if the secret isn't set,
      // ensure they get values here (e.g., from other env vars, or throw if mandatory).
      clientId = process.env.FALLBACK_CLIENT_ID; // Or throw an error if mandatory
      clientSecret = process.env.FALLBACK_CLIENT_SECRET; // Or throw an error if mandatory
  }







  // .............................................................................................

  // TODO: the Google credentials file itself should be extracted from the secrets when in production! not just it's path !!!!!!!!!!!!

  // const credsEnv = process.env.USER_OAUTH2_CREDENTIALS;
  // let googleCreds;

  // if (credsEnv) {
  //   const fullPath = path.resolve(credsEnv);
  //   try {
  //     const raw = fs.readFileSync(fullPath, 'utf8');
  //     googleCreds = JSON.parse(raw);
  //     fastify.log.info('✅ Loaded Google credentials from file');
  //   } catch (err) {
  //     fastify.log.error(err, 'Failed to read or parse Google credentials file');
  //     throw fastify.httpErrors.internalServerError('Invalid Google credentials file', { cause: err });
  //   }
  // } else {
  //   fastify.log.error('No GOOGLE_APPLICATION_CREDENTIALS env var set');
  //   throw fastify.httpErrors.internalServerError('Missing Google credentials');
  // }

  // const clientId = googleCreds.web.client_id;
  // const clientSecret = googleCreds.web.client_secret;
  
  // ....................................................................................


  // let googleCreds = null;

  // if (process.env.USER_OAUTH2_CREDENTIALS) {
  //   const fullPath = path.resolve(process.env.USER_OAUTH2_CREDENTIALS);
  //   try {
  //     googleCreds = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  //   } catch (error) {
  //     console.error('Error reading Google credentials:', error);
  //   }
  // } else {
  //   console.warn('No GOOGLE_APPLICATION_CREDENTIALS path found by process.env.');
  // }

  // if (fastify.secrets.GOOGLE_APPLICATION_CREDENTIALS) {
  //   const fullPath = path.resolve(fastify.secrets.GOOGLE_APPLICATION_CREDENTIALS);
  //   try {
  //     googleCreds = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  //   } catch (error) {
  //     console.error('Error reading Google credentials:', error);
  //   }
  // } else {
  //   console.warn('No GOOGLE_APPLICATION_CREDENTIALS path found in fastify.secrets.');
  // }

  // JWT 

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

  // Determine the base URL dynamically based on environment
  let appBaseUrl;

  if (process.env.NODE_ENV === 'production') {
    // Production environment (Cloud Run)
    appBaseUrl = 'https://eventstorm.me';
  } else { // Assuming NODE_ENV is 'development' for your VM environment
    // Development environment (GCP VM via SSH port forwarding)
    // For your local browser, this will be http://localhost:3000 if using ssh -L
    appBaseUrl = 'http://localhost:3000';
  }

  // OAUTH2

  fastify.register(fastifyOAuth2, {
    name: 'googleOAuth2',
    scope: ['profile', 'email', 'openid'],
    cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    // SameSite: 'None' requires secure: true. 'Lax' is generally safer for development.
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      httpOnly: true,
      allowCredentials: true,
    },
    credentials: {
      client: { id: clientId, secret: clientSecret },
      auth: fastifyOAuth2.GOOGLE_CONFIGURATION
    },
    startRedirectPath: '/api/auth/google',
    callbackUri: 'http://localhost:3000/api/auth/google/callback',
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

  fastify.get('/api/auth/google/callback', async (req, reply) => {
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
    prefix: '/api'
  });

  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'business_modules'),
    options: Object.assign({}, opts),
    encapsulate: true,
    maxDepth: 1,
    dirNameRoutePrefix: false,
    prefix: '/api'
  });

  fastify.get('/debug/clear-state-cookie', (req, reply) => {
    reply.clearCookie('oauth2-redirect-state', { path: '/' });
    reply.send({ message: 'cleared' });
  }); 


  
  fastify.addHook('onReady', async () => {
    fastify.log.info('▶ Registered routes:\n' + fastify.printRoutes());
  });

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

// module.exports.options = { prefix: '/api' }

