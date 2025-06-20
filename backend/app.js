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

const loggingPlugin     = require('./aop_modules/log/plugins/logPlugin');
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
// const swaggerPlugin     = require('./swaggerPlugin');
// const swaggerUIPlugin   = require('./swaggerUIPlugin');
const fastifySwagger    = require('@fastify/swagger');
const fastifySwaggerUI  = require('@fastify/swagger-ui');

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
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'EventStorm.me API',
        description:
          'EventStorm API – Git analysis, AI insights, wiki, chat and more',
        version: '1.0.0',
        contact: {
          name: 'EventStorm Support',
          email: 'support@eventstorm.me',
          url: 'https://eventstorm.me/support'
        },
        license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
        termsOfService: 'https://eventstorm.me/terms'
      },
      servers: [
        {
          url: process.env.NODE_ENV === 'production'
            ? 'https://eventstorm.me'
            : 'http://localhost:3000',
          description: process.env.NODE_ENV === 'production'
            ? 'Production server'
            : 'Development server'
        }
      ],
      tags: [
        { name: 'auth', description: 'Authentication endpoints' },
        { name: 'git', description: 'Git-analysis endpoints' },
        { name: 'ai', description: 'AI-powered endpoints' },
        { name: 'chat', description: 'Chat endpoints' },
        { name: 'wiki', description: 'Wiki endpoints' },
        { name: 'api', description: 'Utility endpoints' }
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          cookieAuth: { type: 'apiKey', in: 'cookie', name: 'authToken' }
        },
        responses: {
          UnauthorizedError: {
            description: 'Authentication information is missing or invalid',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                    message: { type: 'string' },
                    statusCode: { type: 'number' }
                  }
                }
              }
            }
          },
          ServerError: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                    message: { type: 'string' },
                    statusCode: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      },
      security: [{ bearerAuth: [] }, { cookieAuth: [] }]
    },
    exposeRoute: true // This is crucial for exposing the /openapi.json and /openapi.yaml routes
  });

  await fastify.register(helmet, {
    global: true,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", 'https://accounts.google.com/gsi/'],
        scriptSrc: ["'self'", 'https://accounts.google.com/gsi/client'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com/gsi/style'],  
        frameSrc: ["'self'", 'https://accounts.google.com/gsi/'],
        connectSrc: [  
          "'self'", 
          'https://accounts.google.com/gsi/',
          // Add http for local development
          ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000', 'http://localhost:5173'] : [])
        ],
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

  // ────────────────────────────────────────────────────────────────
  // 4️⃣  COOKIE / SESSION
  // ────────────────────────────────────────────────────────────────
  await fastify.register(
    fastifyCookie,
    {
      secret: fastify.secrets.COOKIE_SECRET,
      parseOptions: { secure: true, httpOnly: true, sameSite: 'None' },
    },
    { encapsulate: false }
  );

  class RedisStore extends Store {
    constructor(sendCommand) {
      super();
      this.send = sendCommand;
    }
    get(sid, cb) {
      this.send(['GET', sid])
        .then((data) => cb(null, data ? JSON.parse(data) : null))
        .catch(cb);
    }
    set(sid, sess, ttlMs, cb) {
      const data = JSON.stringify(sess);
      const ttl  = typeof ttlMs === 'number' ? Math.ceil(ttlMs / 1000) : undefined;
      const cmd  = ttl ? ['SETEX', sid, ttl, data] : ['SET', sid, data];
      this.send(cmd).then(() => cb(null)).catch(cb);
    }
    destroy(sid, cb) {
      this.send(['DEL', sid]).then(() => cb(null)).catch(cb);
    }
  }

  await fastify.register(fastifySession, {
    secret: fastify.secrets.SESSION_SECRET,
    cookie: { secure: true, maxAge: 86400000, httpOnly: true, sameSite: 'None' },
    store: new RedisStore(fastify.redis.sendCommand.bind(fastify.redis)),
    saveUninitialized: false,
  });

  // ────────────────────────────────────────────────────────────────
  // 5️⃣  HEALTH ROUTE
  // ────────────────────────────────────────────────────────────────
  fastify.get('/', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // ────────────────────────────────────────────────────────────────
  // 6️⃣  GOOGLE OAUTH + JWT (UNCHANGED FROM ORIGINAL)
  // ────────────────────────────────────────────────────────────────
  let credentialsJsonString, clientId, clientSecret;

  if (
    process.env.USER_OAUTH2_CREDENTIALS &&
    process.env.USER_OAUTH2_CREDENTIALS.startsWith('{')
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

  const cookieSecure   = process.env.NODE_ENV === 'production';
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
  // 7️⃣  AUTOLOAD MODULES
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
  fastify.get('/debug/clear-state-cookie', (req, reply) => {
    reply.clearCookie('oauth2-redirect-state', { path: '/' });
    reply.send({ message: 'cleared' });
  });

  await fastify.register(fastifySwaggerUI, {
    routePrefix: '/api/doc',
    staticCSP: true, // Enable static CSP headers for the UI
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      defaultModelRendering: 'example',
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
      persistAuthorization: true,
      layout: 'StandaloneLayout',
      // Custom CSS for better aesthetics
      customCss: `
        .swagger-ui .topbar{display:none;}
        .swagger-ui .info .title{color:#1f2937;}
        .swagger-ui .scheme-container{background:#f8f9fa;padding:10px;border-radius:4px;}
        .swagger-ui .info .description {font-size: 14px; line-height: 1.6;}
        .swagger-ui .btn.authorize {background-color: #4f46e5; border-color: #4f46e5;}
        .swagger-ui .btn.authorize:hover {background-color: #4338ca;}
      `,
      customSiteTitle: 'EventStorm.me API Docs',
      customfavIcon: '/favicon.ico',
      // Optional: Add request/response interceptors for debugging Swagger UI calls
      requestInterceptor: req => {
        console.log('🌐 Swagger UI Request:', {
          url: req.url, method: req.method, headers: req.headers
        });
        return req;
      },
      responseInterceptor: res => {
        console.log('📡 Swagger UI Response:', {
          url: res.url, status: res.status, statusText: res.statusText
        });
        return res;
      }
    },
    // Transform CSP headers for Swagger UI to allow necessary external resources and inline styles/scripts
    transformStaticCSP: (hdr) => {
      let newHdr = hdr.replace(
        /default-src 'self'/g,
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:"
      );
      // Add connect-src directives based on environment for local development
      if (process.env.NODE_ENV !== 'production') {
        newHdr += "; connect-src 'self' http://localhost:3000 http://localhost:5173 http://127.0.0.1:3000 ws://localhost:* wss://localhost:* https: data: blob:";
      } else {
        newHdr += "; connect-src 'self' https: wss: data: blob:";
      }
      newHdr += "; style-src 'self' 'unsafe-inline' https:"; // Allow inline styles and HTTPS sources
      newHdr += "; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:"; // Allow inline scripts, eval, and HTTPS sources
      return newHdr;
    },
    transformSpecificationClone: true, // Clone the spec before transforming
    // Transform the OpenAPI specification
    transformSpecification(spec) {
      spec.info['x-build-time'] = new Date().toISOString();
      spec.info['x-builder'] = 'anatolyZader';
      spec.info['x-environment'] = process.env.NODE_ENV || 'development';
      spec.info['x-node-version'] = process.version; // Add Node.js version to the spec info

      // Adjust server URLs for development environment
      if (process.env.NODE_ENV !== 'production') {
        spec.servers = [
          { url: 'http://localhost:3000', description: 'Development server' },
          { url: 'http://127.0.0.1:3000', description: 'Development server (alternative)' }
        ];
      }

      spec.info['x-security-note'] = 'This API uses JWT Bearer tokens or cookie-based authentication';
      return spec;
    }
  });

  // fastify.after(async () => {
  //   await fastify.register(swaggerUIPlugin);
  // });

  // ────────────────────────────────────────────────────────────────
  // 9️⃣  READY HOOK – print summary
  // ────────────────────────────────────────────────────────────────

  fastify.addHook('onReady', async () => {
    fastify.log.info('▶ Registered routes:\n' + fastify.printRoutes());
  });
};
