// app.js
'use strict';
/* eslint-disable no-unused-vars */

const path              = require('node:path');
const fs                = require('fs');
const AutoLoad          = require('@fastify/autoload');
const fastifySensible   = require('@fastify/sensible');
const fastifyCookie     = require('@fastify/cookie');
const fastifySession    = require('@fastify/session');
const { Store }         = fastifySession;
const redisPlugin       = require('./redisPlugin');
const websocketPlugin   = require('./websocketPlugin');
const loggingPlugin     = require('./logPlugin');
const schemaLoaderPlugin = require('./env_schemas/schemaLoaderPlugin');
const envPlugin         = require('./envPlugin');
const diPlugin          = require('./diPlugin');
const corsPlugin        = require('./corsPlugin');
const helmet            = require('@fastify/helmet');
const fastifyJwt        = require('@fastify/jwt');
const fastifyOAuth2     = require('@fastify/oauth2');
const { OAuth2Client }  = require('google-auth-library');
const { v4: uuidv4 }    = require('uuid');
const authSchemasPlugin = require('./aop_modules/auth/plugins/authSchemasPlugin');
const swaggerPlugin     = require('./swaggerPlugin');
const swaggerUIPlugin   = require('./swaggerUIPlugin');
const pubsubPlugin      = require('./pubsubPlugin');
const eventDispatcher   = require('./eventDispatcher');

require('dotenv').config();

module.exports = async function (fastify, opts) {

  fastify.addHook('onRoute', (routeOptions) => {
    fastify.log.info({ method: routeOptions.method, url: routeOptions.url }, 'route registered');
  });

  await fastify.register(loggingPlugin);
  await fastify.register(schemaLoaderPlugin);
  await fastify.register(envPlugin);
  await fastify.register(diPlugin);
  await fastify.register(websocketPlugin);
  await fastify.register(fastifySensible);
  await fastify.register(eventDispatcher);
  await fastify.register(pubsubPlugin);
  

  await fastify.register(swaggerPlugin);
  await fastify.register(swaggerUIPlugin);

  // Sets security-related HTTP headers automatically
  await fastify.register(helmet, {
    global: true,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", 'https://accounts.google.com/gsi/'], // Allows resources by default from the same origin ('self') and Google Identity Services.
        scriptSrc: ["'self'", 'https://accounts.google.com/gsi/client'], // Allows scripts to load only from your own site and from Google's GSI client.
        styleSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com/gsi/style'], // Allows styles from your own site, inline styles ('unsafe-inline'), and Google's GSI style endpoint.
        frameSrc: ["'self'", 'https://accounts.google.com/gsi/'], // Allows iframes only from your own site and Google Identity Services.
        connectSrc: [  
          "'self'", 
          'https://accounts.google.com/gsi/',
          // Add http for local development
          ...(process.env.NODE_ENV !== 'staging' ? ['http://localhost:3000', 'http://localhost:5173'] : [])
        ], // Allows network connections to your own site, Google Identity Services, and (for non-staging environments) local development servers on ports 3000 and 5173.
      },
    },
  });

  await fastify.register(corsPlugin);

  fastify.log.info('🔌 Registering Redis client plugin');
  await fastify.register(redisPlugin);
  fastify.log.info('✅ Redis client plugin registered');
  fastify.redis.on('error', (err) => {
    fastify.log.error({ err }, 'Redis client error');
  });
  fastify.log.info('⏳ Testing Redis connection with PING…');
  try {
    const pong = await fastify.redis.ping();
    fastify.log.info(`✅ Redis PING response: ${pong}`);
  } catch (err) {
    fastify.log.error({ err }, '❌ Redis PING failed');
  }

  await fastify.register(
    fastifyCookie,
    {
      secret: fastify.secrets.COOKIE_SECRET,
      parseOptions: { 
        secure: true, // Only send cookies over HTTPS.
        httpOnly: true, // Prevents client-side JavaScript from accessing the cookie. Helps mitigate XSS (Cross-Site Scripting) attacks.
        sameSite: 'None' }, // Allows cross-site cookies (e.g., for third-party integrations). Must be used with secure: true (required by modern browsers).
    },
    { encapsulate: false }
  );

  class RedisStore extends Store { // @fastify/session package exports a Store base class for session stores. This is the recommended way to get the session store parent class for custom session stores
    constructor(sendCommand) {
      super();
      this.send = sendCommand;
    }

    // get session data from Redis
    // sid - session ID, sess - session object, ttlMs - time to live in milliseconds (for JavaScript/Node.js), cb - callback function, ttl - time-to-live (in seconds (for Redis), ttlMs is converted to ttl by dividing by 1000 and rounding), 
    get(sid, cb) {
      this.send(['GET', sid])
        .then((data) => cb(null, data ? JSON.parse(data) : null))
        .catch(cb);
    }

    // store session data in Redis.
    set(sid, sess, ttlMs, cb) {
      const data = JSON.stringify(sess);
      const ttl  = typeof ttlMs === 'number' ? Math.ceil(ttlMs / 1000) : undefined;
      const cmd  = ttl ? ['SETEX', sid, ttl, data] : ['SET', sid, data]; // SETEX Redis command, which means “set the key sid to the value data and expire it after ttl seconds” Vs. SET Redis command, which means “set the key sid to the value data” with no expiration.
      this.send(cmd).then(() => cb(null)).catch(cb); // If successful, calls cb(null) to indicate success. If there’s an error, passes the error to the callback (catch(cb)).
    }

    destroy(sid, cb) {
      this.send(['DEL', sid]).then(() => cb(null)).catch(cb);
    }
  }

  await fastify.register(fastifySession, {
    secret: fastify.secrets.SESSION_SECRET,
    cookie: { secure: true, maxAge: 86400000, httpOnly: true, sameSite: 'None' },
    store: new RedisStore(fastify.redis.sendCommand.bind(fastify.redis)), // where session data is stored.
    saveUninitialized: false, // Do not create session until something stored in session.
  });

  // ────────────────────────────────────────────────────────────────
  // HEALTH ROUTE
  // ────────────────────────────────────────────────────────────────
  fastify.get('/', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // ────────────────────────────────────────────────────────────────
  // GOOGLE OAUTH + JWT 
  // ────────────────────────────────────────────────────────────────
  let credentialsJsonString, clientId, clientSecret;

  if (
    process.env.USER_OAUTH2_CREDENTIALS &&
    process.env.USER_OAUTH2_CREDENTIALS.startsWith('{') // if it looks like a JSON string
  ) {
    credentialsJsonString = JSON.parse(process.env.USER_OAUTH2_CREDENTIALS);
  } else if (fastify.secrets && typeof fastify.secrets.USER_OAUTH2_CREDENTIALS === 'string') {
    const credentialsPath = fastify.secrets.USER_OAUTH2_CREDENTIALS;
    credentialsJsonString = JSON.parse(
      await fs.promises.readFile(credentialsPath, { encoding: 'utf8' })
    );
  } else {
    clientId = process.env.FALLBACK_CLIENT_ID;
    clientSecret = process.env.FALLBACK_CLIENT_SECRET;
  }

  if (credentialsJsonString) {
    clientId = credentialsJsonString.web.client_id;
    clientSecret = credentialsJsonString.web.client_secret;
  }

  const revokedTokens = new Map();

  fastify.register(fastifyJwt, {
    secret: fastify.secrets.JWT_SECRET,
    sign: { expiresIn: fastify.secrets.JWT_EXPIRE_IN },
    verify: { requestProperty: 'user' },
    trusted(request, decoded) {
      return !revokedTokens.has(decoded.jti);
    },
  });

  fastify.decorate('verifyToken', async function (request) {
    let token = request.cookies?.authToken;
    if (!token && request.headers.authorization) {
      const [scheme, value] = request.headers.authorization.split(' ');
      if (scheme === 'Bearer') token = value;
    }
    if (!token) throw fastify.httpErrors.unauthorized('Missing token');
    request.user = await fastify.jwt.verify(token);
  });

  fastify.decorateRequest('revokeToken', function () {
    if (!this.user?.jti) throw this.httpErrors.unauthorized('Missing jti');
    revokedTokens.set(this.user.jti, true);
  });

  fastify.decorateRequest('generateToken', async function () {
    return fastify.jwt.sign(
      { id: String(this.user.id), username: this.user.username },
      { jwtid: uuidv4(), expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
    );
  });

  const cookieSecure   = process.env.NODE_ENV === 'staging';
  const cookieSameSite = cookieSecure ? 'None' : 'Lax';
  const googleCallbackUri =
    cookieSecure
      ? 'https://eventstorm.me/api/auth/google/callback'
      : 'http://localhost:3000/api/auth/google/callback';

  await fastify.register(
    fastifyOAuth2,
    {
      name: 'googleOAuth2',
      scope: ['profile', 'email', 'openid'],
      cookie: { secure: cookieSecure, sameSite: cookieSameSite, httpOnly: true },
      credentials: {
        client: { id: clientId, secret: clientSecret },
        auth: fastifyOAuth2.GOOGLE_CONFIGURATION,
      },
      startRedirectPath: '/api/auth/google',
      callbackUri: googleCallbackUri,
    },
    { encapsulate: false }
  );

  const googleClient = new OAuth2Client(clientId);
  fastify.decorate('verifyGoogleIdToken', async (idToken) => {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: clientId });
    return ticket.getPayload();
  });

  await fastify.register(authSchemasPlugin);

  fastify.get('/api/auth/google/callback', async (req, reply) => {
    const token            = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
    const googleAccessToken = token.token.access_token;

    const userService = await req.diScope.resolve('userService');
    const googleUser  = await userService.loginWithGoogle(googleAccessToken);
    if (!googleUser) return reply.unauthorized('Google profile invalid');

    const jti  = uuidv4();
    const jwt  = fastify.jwt.sign(
      { id: googleUser.id, username: googleUser.username, jti },
      { jwtid: jti, expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
    );

    reply.setCookie('authToken', jwt, {
      path: '/',
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
    });

    reply.redirect((cookieSecure ? 'https://eventstorm.me' : 'http://localhost:5173') + '/chat');
  });

  // ────────────────────────────────────────────────────────────────
  // AUTOLOAD MODULES
  // ────────────────────────────────────────────────────────────────
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'aop_modules'),
    encapsulate: false,
    maxDepth: 1,
    dirNameRoutePrefix: false,
    prefix: '/api',
    options: Object.assign({}, opts),
  });

  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'business_modules'),
    encapsulate: true,
    maxDepth: 1,
    dirNameRoutePrefix: false,
    prefix: '/api',
    options: Object.assign({}, opts),
  });

  // Debug route
  fastify.route({
    method: 'GET',
    url: '/api/debug/clear-state-cookie',
    handler: (req, reply) => {
      reply.clearCookie('oauth2-redirect-state', { path: '/' });
      reply.send({ message: 'cleared' });
    },
    schema: {
      $id: 'schema:debug:clear-state-cookie',
      response: {
        200: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Confirmation message that the state cookie was cleared.'
            }
          },
          additionalProperties: false
        }
      }
    }
  });

  // ────────────────────────────────────────────────────────────────
  // READY HOOK – print summary
  // ────────────────────────────────────────────────────────────────

  fastify.addHook('onReady', async () => {
    fastify.log.info('▶ Registered routes:\n' + fastify.printRoutes());
  });
};
