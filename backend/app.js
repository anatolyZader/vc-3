// app.js
'use strict';
/* eslint-disable no-unused-vars */

const path = require('node:path');
const AutoLoad = require('@fastify/autoload');
const fastifySensible = require('@fastify/sensible');

const fastifyCookie = require('@fastify/cookie');
const fastifySession = require('@fastify/session');
const redisPlugin = require('./redisPlugin');
const websocketPlugin = require('./websocketPlugin');
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

  // Register core plugins first
  await fastify.register(loggingPlugin);
  await fastify.register(schemaLoaderPlugin);
  await fastify.register(envPlugin);
  await fastify.register(diPlugin);


  await fastify.register(websocketPlugin);
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

  // Register Swagger directly here instead of using swaggerPlugin
  console.log('--- REGISTERING SWAGGER DIRECTLY IN APP.JS ---');
  try {
    await fastify.register(require('@fastify/swagger'), {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'EventStorm.me API',
          description: 'EventStorm API Documentation',
          version: '1.0.0'
        },
        servers: [
          {
            url: process.env.NODE_ENV === 'production' ? 'https://eventstorm.me' : 'http://localhost:3000',
            description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
          }
        ],
        tags: [
          { name: 'auth', description: 'Authentication endpoints' },
          { name: 'ai', description: 'AI service endpoints' },
          { name: 'chat', description: 'Chat service endpoints' },
          { name: 'git', description: 'Git service endpoints' },
          { name: 'wiki', description: 'Wiki service endpoints' },
          { name: 'api', description: 'API management endpoints' }
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            },
            cookieAuth: {
              type: 'apiKey',
              in: 'cookie',
              name: 'authToken'
            }
          }
        }
      },
      exposeRoute: true,
      routePrefix: '/api/doc',
      hideUntagged: false
    });
    
    console.log('✅ @fastify/swagger registered directly in app.js');
    
    // Verify the decorator exists immediately
    if (fastify.hasDecorator('swagger')) {
      console.log('✅ Swagger decorator is available in app.js');
    } else {
      console.log('❌ Swagger decorator is NOT available in app.js');
    }
    
  } catch (error) {
    console.error('❌ Error registering Swagger directly in app.js:', error);
    throw error;
  }

  // Redis setup
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

  // Cookie and session setup
  try {
    await fastify.register(fastifyCookie, {
      secret: fastify.secrets.COOKIE_SECRET,
      parseOptions: {
        secure: true,
        httpOnly: true,
        sameSite: 'None',
      }
    }, { 
      encapsulate: false 
    });
    
    console.log('Cookie package successfully registered');
  } catch (error) {
    console.error('Error registering @fastify/cookie:', error);
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
    }
  }

  await fastify.register(fastifySession, {
    secret: fastify.secrets.SESSION_SECRET, 
    cookie: { 
      secure: true,  
      maxAge: 86400000,
      httpOnly: true,
      sameSite: 'None',
    },
    store: new RedisStore(fastify.redis.sendCommand.bind(fastify.redis)),
    saveUninitialized: false,
  });

  // Health Check Route
  fastify.get('/', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Google OAuth setup (your existing code)
  let credentialsJsonString, clientId, clientSecret;

  if (process.env.USER_OAUTH2_CREDENTIALS && process.env.USER_OAUTH2_CREDENTIALS.startsWith('{')) {
    console.log('accessed process.env.USER_OAUTH2_CREDENTIALS (direct JSON) for auth');
    try {
      credentialsJsonString = JSON.parse(process.env.USER_OAUTH2_CREDENTIALS);
    } catch (error) {
      console.error('Error parsing Google credentials from process.env.USER_OAUTH2_CREDENTIALS:', error);
      throw fastify.httpErrors.internalServerError('Failed to parse Google OAuth2 credentials from environment variable. Invalid JSON.', { cause: error });
    }
  } else if (fastify.secrets && typeof fastify.secrets.USER_OAUTH2_CREDENTIALS === 'string') {
    console.log('accessed fastify secrets (file path) for auth');
    const credentialsPath = fastify.secrets.USER_OAUTH2_CREDENTIALS;
    console.log('XXX credentialsPath:', credentialsPath);
    try {
      credentialsJsonString = JSON.parse(await fs.promises.readFile(credentialsPath, { encoding: 'utf8' }));
    } catch (error) {
      console.error('Error reading Google credentials file from fastify.secrets:', error);
      throw fastify.httpErrors.internalServerError('Failed to read Google OAuth2 credentials file.', { cause: error });
    }
  } else {
    fastify.log.warn('No USER_OAUTH2_CREDENTIALS secret/env var or fastify.secrets path provided for OAuth2 client setup. Proceeding without it, or using fallback.');
    clientId = process.env.FALLBACK_CLIENT_ID;
    clientSecret = process.env.FALLBACK_CLIENT_SECRET;
  }
    
  console.log(' credentialsJsonString accessed in google run:', credentialsJsonString);

  if (credentialsJsonString) {
    try {
      clientId = credentialsJsonString.web.client_id;
      clientSecret = credentialsJsonString.web.client_secret;
      fastify.log.info('Loaded Google OAuth2 credentials from environment variable/secret.');
    } catch (err) {
      throw fastify.httpErrors.internalServerError('Failed to parse Google OAuth2 credentials from environment variable/secret. Invalid JSON.', { cause: err });
    }
  } else {
    fastify.log.info('No USER_OAUTH2_CREDENTIALS secret/env var provided for OAuth2 client setup. Proceeding without it, or using fallback.');
    clientId = process.env.FALLBACK_CLIENT_ID;
    clientSecret = process.env.FALLBACK_CLIENT_SECRET;
  }

  // JWT setup
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

  // Environment-based configuration
  let appBaseUrl, frontendBaseUrl, cookieSecure, cookieSameSite, googleCallbackUri;

  if (process.env.NODE_ENV === 'production') {
    appBaseUrl = 'https://eventstorm.me';
    frontendBaseUrl = 'https://eventstorm.me';
    cookieSecure = true;
    cookieSameSite = 'None';
    googleCallbackUri = 'https://eventstorm.me/api/auth/google/callback';
  } else {
    appBaseUrl = 'http://localhost:3000';
    frontendBaseUrl = 'http://localhost:5173';
    cookieSecure = false;
    cookieSameSite = 'Lax';
    googleCallbackUri = 'http://localhost:3000/api/auth/google/callback';
  }

  // OAuth2 setup
  fastify.register(fastifyOAuth2, {
    name: 'googleOAuth2',
    scope: ['profile', 'email', 'openid'],
    cookie: {
      secure: cookieSecure,
      sameSite: cookieSameSite,
      httpOnly: true,
      allowCredentials: true,
    },   
    credentials: {
      client: { id: clientId, secret: clientSecret },
      auth: fastifyOAuth2.GOOGLE_CONFIGURATION
    },
    startRedirectPath: '/api/auth/google',
    callbackUri: googleCallbackUri,
  }, {
    encapsulate: false
  });  

  const googleClient = new OAuth2Client(clientId);
  fastify.decorate('verifyGoogleIdToken', async function (googleIdToken) {
    console.log('Verifying Google ID token:', googleIdToken);
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
      
      const userService = await req.diScope.resolve('userService');
      console.log('userService successfully resolved in app.js:', userService);
      const googleUser = await userService.loginWithGoogle(googleAccessToken);
      if (!googleUser) {
        return reply.unauthorized('Google profile invalid or not verified.');
      }

      const jti = uuidv4();
      const localJwt = fastify.jwt.sign({
        id: googleUser.id,
        username: googleUser.username,
        jti
      }, {
        jwtid: jti,
        expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h'
      });
  
      reply.setCookie('authToken', localJwt, {
        path: '/',
        httpOnly: true,
        secure: cookieSecure,
        sameSite: cookieSameSite,
      });
  
      reply.redirect(`${frontendBaseUrl}/chat`);
  
    } catch (err) {
      console.error('Google OAuth callback error:', err);
      return reply.internalServerError('OAuth failed', { cause: err });
    }
  });
  
  // Register AOP modules
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'aop_modules'),
    options: Object.assign({}, opts),
    encapsulate: false,
    maxDepth: 1,
    dirNameRoutePrefix: false,
    prefix: '/api'
  });

  // Register business modules
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'business_modules'),
    options: Object.assign({}, opts),
    encapsulate: true,
    maxDepth: 1,
    dirNameRoutePrefix: false,
    prefix: '/api'
  });

  // Debug route
  fastify.get('/debug/clear-state-cookie', (req, reply) => {
    reply.clearCookie('oauth2-redirect-state', { path: '/' });
    reply.send({ message: 'cleared' });
  }); 

  // Check decorator availability before onReady
  fastify.addHook('onReady', async () => {
    fastify.log.info('▶ Registered routes:\n' + fastify.printRoutes());
    
    // Check if decorator is available now
    console.log('🔍 Checking swagger decorator availability in onReady...');
    if (fastify.hasDecorator('swagger')) {
      console.log('✅ Swagger decorator found in onReady!');
      try {
        const spec = fastify.swagger();
        const outputDir = path.join(__dirname, 'business_modules/api/infrastructure/api');
        const outputPath = path.join(outputDir, 'httpApiSpec.json');
        
        await fs.promises.mkdir(outputDir, { recursive: true });
        await fs.promises.writeFile(outputPath, JSON.stringify(spec, null, 2), 'utf8');
        
        fastify.log.info(`✔ OpenAPI spec written to ${outputPath}`);
      } catch (err) {
        fastify.log.error('✘ Failed to write OpenAPI spec:', err);
        fastify.log.error('Full error stack:', err.stack);
      }
    } else {
      fastify.log.warn('❌ Swagger decorator STILL not found in onReady – this indicates a scope issue');
      console.log('Available decorators:', Object.getOwnPropertyNames(fastify));
    }
  });
};