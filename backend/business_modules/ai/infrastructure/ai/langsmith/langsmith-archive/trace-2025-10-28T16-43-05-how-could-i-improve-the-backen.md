---
**ARCHIVED TRACE ANALYSIS**
- Archived on: 2025-10-28T16:43:05.999Z
- Triggered by query: "how could i improve the backend app.js file?"
- Original file: latest-trace-analysis.md
---

# LangSmith RAG Trace Analysis - 10/28/2025, 4:42:11 PM

## 🔍 Query Details
- **Query**: "explain in details wwhat the root backend app.js file inlcluse"
- **User ID**: d41402df-182a-41ec-8f05-153118bf2718
- **Conversation ID**: ef5ec50c-2ccd-43f0-b58c-10560bf1ec19
- **Started**: 2025-10-28T16:42:11.675Z
- **Completed**: 2025-10-28T16:42:16.045Z
- **Total Duration**: 4370ms

## 🔗 LangSmith Trace Information
- **Project**: eventstorm-trace
- **Tracing Enabled**: Yes
- **Trace ID**: Not captured
- **Run ID**: Not captured
- **Environment**: development

### Pipeline Execution Steps:
1. **initialization** (2025-10-28T16:42:11.675Z) - success
2. **vector_store_check** (2025-10-28T16:42:11.675Z) - success
3. **vector_search** (2025-10-28T16:42:12.254Z) - success - Found 2 documents
4. **text_search** (2025-10-28T16:42:12.257Z) - success - Found 2 documents
5. **hybrid_search_combination** (2025-10-28T16:42:12.257Z) - success
6. **context_building** (2025-10-28T16:42:12.258Z) - success - Context: 2764 chars
7. **response_generation** (2025-10-28T16:42:16.045Z) - success - Response: 1708 chars

## 📊 Vector Search Analysis

### Search Configuration:
- **Vector Store**: primary
- **Search Strategy**: intelligent_strategy_with_filters
- **Documents Retrieved**: 2
- **Total Context**: 17,171 characters

### Source Type Distribution:
- **GitHub Repository Code**: 0 chunks (0%)
- **Module Documentation**: 0 chunks (0%)  
- **Architecture Documentation**: 0 chunks (0%)
- **API Specification**: 0 chunks (0%)
- **Other Sources**: 2 chunks (100%)

## 📋 Complete Chunk Analysis


### Chunk 1/2
- **Source**: backend/app.js
- **Type**: github-code
- **Size**: 15900 characters
- **Score**: 0.5
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**Full Content**:
```
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

```

**Metadata**:
```json
{
  "text": "// app.js\n'use strict';\n/* eslint-disable no-unused-vars */\n\nconst path              = require('node:path');\nconst fs                = require('fs');\nconst AutoLoad          = require('@fastify/autoload');\nconst fastifySensible   = require('@fastify/sensible');\n\nconst fastifyCookie     = require('@fastify/cookie');\nconst fastifySession    = require('@fastify/session');\nconst { Store }         = fastifySession;\n\nconst redisPlugin       = require('./redisPlugin');\nconst websocketPlugin   = require('./websocketPlugin');\n\nconst loggingPlugin     = require('./aop_modules/log/plugins/logPlugin');\nconst schemaLoaderPlugin = require('./env_schemas/schemaLoaderPlugin');\nconst envPlugin         = require('./envPlugin');\nconst diPlugin          = require('./diPlugin');\nconst corsPlugin        = require('./corsPlugin');\nconst helmet            = require('@fastify/helmet');\nconst fastifyJwt        = require('@fastify/jwt');\nconst fastifyOAuth2     = require('@fastify/oauth2');\nconst { OAuth2Client }  = require('google-auth-library');\nconst { v4: uuidv4 }    = require('uuid');\nconst authSchemasPlugin = require('./aop_modules/auth/plugins/authSchemasPlugin');\n// const swaggerPlugin     = require('./swaggerPlugin');\n// const swaggerUIPlugin   = require('./swaggerUIPlugin');\nconst fastifySwagger    = require('@fastify/swagger');\nconst fastifySwaggerUI  = require('@fastify/swagger-ui');\n\nrequire('dotenv').config();\n\nmodule.exports = async function (fastify, opts) {\n\n  fastify.addHook('onRoute', (routeOptions) => {\n    fastify.log.info({ method: routeOptions.method, url: routeOptions.url }, 'route registered');\n  });\n\n  await fastify.register(loggingPlugin);\n  await fastify.register(schemaLoaderPlugin);\n  await fastify.register(envPlugin);\n  await fastify.register(diPlugin);\n\n  await fastify.register(websocketPlugin);\n  await fastify.register(fastifySensible);\n  await fastify.register(fastifySwagger, {\n    openapi: {\n      openapi: '3.0.0',\n      info: {\n        title: 'EventStorm.me API',\n        description:\n          'EventStorm API – Git analysis, AI insights, wiki, chat and more',\n        version: '1.0.0',\n        contact: {\n          name: 'EventStorm Support',\n          email: 'support@eventstorm.me',\n          url: 'https://eventstorm.me/support'\n        },\n        license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },\n        termsOfService: 'https://eventstorm.me/terms'\n      },\n      servers: [\n        {\n          url: process.env.NODE_ENV === 'production'\n            ? 'https://eventstorm.me'\n            : 'http://localhost:3000',\n          description: process.env.NODE_ENV === 'production'\n            ? 'Production server'\n            : 'Development server'\n        }\n      ],\n      tags: [\n        { name: 'auth', description: 'Authentication endpoints' },\n        { name: 'git', description: 'Git-analysis endpoints' },\n        { name: 'ai', description: 'AI-powered endpoints' },\n        { name: 'chat', description: 'Chat endpoints' },\n        { name: 'wiki', description: 'Wiki endpoints' },\n        { name: 'api', description: 'Utility endpoints' }\n      ],\n      components: {\n        securitySchemes: {\n          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },\n          cookieAuth: { type: 'apiKey', in: 'cookie', name: 'authToken' }\n        },\n        responses: {\n          UnauthorizedError: {\n            description: 'Authentication information is missing or invalid',\n            content: {\n              'application/json': {\n                schema: {\n                  type: 'object',\n                  properties: {\n                    error: { type: 'string' },\n                    message: { type: 'string' },\n                    statusCode: { type: 'number' }\n                  }\n                }\n              }\n            }\n          },\n          ServerError: {\n            description: 'Internal server error',\n            content: {\n              'application/json': {\n                schema: {\n                  type: 'object',\n                  properties: {\n                    error: { type: 'string' },\n                    message: { type: 'string' },\n                    statusCode: { type: 'number' }\n                  }\n                }\n              }\n            }\n          }\n        }\n      },\n      security: [{ bearerAuth: [] }, { cookieAuth: [] }]\n    },\n    exposeRoute: true // This is crucial for exposing the /openapi.json and /openapi.yaml routes\n  });\n\n  await fastify.register(helmet, {\n    global: true,\n    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },\n    contentSecurityPolicy: {\n      directives: {\n        defaultSrc: [\"'self'\", 'https://accounts.google.com/gsi/'],\n        scriptSrc: [\"'self'\", 'https://accounts.google.com/gsi/client'],\n        styleSrc: [\"'self'\", \"'unsafe-inline'\", 'https://accounts.google.com/gsi/style'],  \n        frameSrc: [\"'self'\", 'https://accounts.google.com/gsi/'],\n        connectSrc: [  \n          \"'self'\", \n          'https://accounts.google.com/gsi/',\n          // Add http for local development\n          ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000', 'http://localhost:5173'] : [])\n        ],\n      },\n    },\n  });\n\n\n  await fastify.register(corsPlugin);\n\n  fastify.log.info('🔌 Registering Redis client plugin');\n  await fastify.register(redisPlugin);\n  fastify.log.info('✅ Redis client plugin registered');\n\n  fastify.redis.on('error', (err) => {\n    fastify.log.error({ err }, 'Redis client error');\n  });\n\n  fastify.log.info('⏳ Testing Redis connection with PING…');\n  try {\n    const pong = await fastify.redis.ping();\n    fastify.log.info(`✅ Redis PING response: ${pong}`);\n  } catch (err) {\n    fastify.log.error({ err }, '❌ Redis PING failed');\n  }\n\n  // ────────────────────────────────────────────────────────────────\n  // 4️⃣  COOKIE / SESSION\n  // ────────────────────────────────────────────────────────────────\n  await fastify.register(\n    fastifyCookie,\n    {\n      secret: fastify.secrets.COOKIE_SECRET,\n      parseOptions: { secure: true, httpOnly: true, sameSite: 'None' },\n    },\n    { encapsulate: false }\n  );\n\n  class RedisStore extends Store {\n    constructor(sendCommand) {\n      super();\n      this.send = sendCommand;\n    }\n    get(sid, cb) {\n      this.send(['GET', sid])\n        .then((data) => cb(null, data ? JSON.parse(data) : null))\n        .catch(cb);\n    }\n    set(sid, sess, ttlMs, cb) {\n      const data = JSON.stringify(sess);\n      const ttl  = typeof ttlMs === 'number' ? Math.ceil(ttlMs / 1000) : undefined;\n      const cmd  = ttl ? ['SETEX', sid, ttl, data] : ['SET', sid, data];\n      this.send(cmd).then(() => cb(null)).catch(cb);\n    }\n    destroy(sid, cb) {\n      this.send(['DEL', sid]).then(() => cb(null)).catch(cb);\n    }\n  }\n\n  await fastify.register(fastifySession, {\n    secret: fastify.secrets.SESSION_SECRET,\n    cookie: { secure: true, maxAge: 86400000, httpOnly: true, sameSite: 'None' },\n    store: new RedisStore(fastify.redis.sendCommand.bind(fastify.redis)),\n    saveUninitialized: false,\n  });\n\n  // ────────────────────────────────────────────────────────────────\n  // 5️⃣  HEALTH ROUTE\n  // ────────────────────────────────────────────────────────────────\n  fastify.get('/', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));\n\n  // ────────────────────────────────────────────────────────────────\n  // 6️⃣  GOOGLE OAUTH + JWT (UNCHANGED FROM ORIGINAL)\n  // ────────────────────────────────────────────────────────────────\n  let credentialsJsonString, clientId, clientSecret;\n\n  if (\n    process.env.USER_OAUTH2_CREDENTIALS &&\n    process.env.USER_OAUTH2_CREDENTIALS.startsWith('{')\n  ) {\n    credentialsJsonString = JSON.parse(process.env.USER_OAUTH2_CREDENTIALS);\n  } else if (fastify.secrets && typeof fastify.secrets.USER_OAUTH2_CREDENTIALS === 'string') {\n    const credentialsPath = fastify.secrets.USER_OAUTH2_CREDENTIALS;\n    credentialsJsonString = JSON.parse(\n      await fs.promises.readFile(credentialsPath, { encoding: 'utf8' })\n    );\n  } else {\n    clientId = process.env.FALLBACK_CLIENT_ID;\n    clientSecret = process.env.FALLBACK_CLIENT_SECRET;\n  }\n\n  if (credentialsJsonString) {\n    clientId = credentialsJsonString.web.client_id;\n    clientSecret = credentialsJsonString.web.client_secret;\n  }\n\n  const revokedTokens = new Map();\n\n  fastify.register(fastifyJwt, {\n    secret: fastify.secrets.JWT_SECRET,\n    sign: { expiresIn: fastify.secrets.JWT_EXPIRE_IN },\n    verify: { requestProperty: 'user' },\n    trusted(request, decoded) {\n      return !revokedTokens.has(decoded.jti);\n    },\n  });\n\n  fastify.decorate('verifyToken', async function (request) {\n    let token = request.cookies?.authToken;\n    if (!token && request.headers.authorization) {\n      const [scheme, value] = request.headers.authorization.split(' ');\n      if (scheme === 'Bearer') token = value;\n    }\n    if (!token) throw fastify.httpErrors.unauthorized('Missing token');\n    request.user = await fastify.jwt.verify(token);\n  });\n\n  fastify.decorateRequest('revokeToken', function () {\n    if (!this.user?.jti) throw this.httpErrors.unauthorized('Missing jti');\n    revokedTokens.set(this.user.jti, true);\n  });\n\n  fastify.decorateRequest('generateToken', async function () {\n    return fastify.jwt.sign(\n      { id: String(this.user.id), username: this.user.username },\n      { jwtid: uuidv4(), expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }\n    );\n  });\n\n  const cookieSecure   = process.env.NODE_ENV === 'production';\n  const cookieSameSite = cookieSecure ? 'None' : 'Lax';\n  const googleCallbackUri =\n    cookieSecure\n      ? 'https://eventstorm.me/api/auth/google/callback'\n      : 'http://localhost:3000/api/auth/google/callback';\n\n  await fastify.register(\n    fastifyOAuth2,\n    {\n      name: 'googleOAuth2',\n      scope: ['profile', 'email', 'openid'],\n      cookie: { secure: cookieSecure, sameSite: cookieSameSite, httpOnly: true },\n      credentials: {\n        client: { id: clientId, secret: clientSecret },\n        auth: fastifyOAuth2.GOOGLE_CONFIGURATION,\n      },\n      startRedirectPath: '/api/auth/google',\n      callbackUri: googleCallbackUri,\n    },\n    { encapsulate: false }\n  );\n\n  const googleClient = new OAuth2Client(clientId);\n  fastify.decorate('verifyGoogleIdToken', async (idToken) => {\n    const ticket = await googleClient.verifyIdToken({ idToken, audience: clientId });\n    return ticket.getPayload();\n  });\n\n  await fastify.register(authSchemasPlugin);\n\n  fastify.get('/api/auth/google/callback', async (req, reply) => {\n    const token            = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);\n    const googleAccessToken = token.token.access_token;\n\n    const userService = await req.diScope.resolve('userService');\n    const googleUser  = await userService.loginWithGoogle(googleAccessToken);\n    if (!googleUser) return reply.unauthorized('Google profile invalid');\n\n    const jti  = uuidv4();\n    const jwt  = fastify.jwt.sign(\n      { id: googleUser.id, username: googleUser.username, jti },\n      { jwtid: jti, expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }\n    );\n\n    reply.setCookie('authToken', jwt, {\n      path: '/',\n      httpOnly: true,\n      secure: cookieSecure,\n      sameSite: cookieSameSite,\n    });\n\n    reply.redirect((cookieSecure ? 'https://eventstorm.me' : 'http://localhost:5173') + '/chat');\n  });\n\n  // ────────────────────────────────────────────────────────────────\n  // 7️⃣  AUTOLOAD MODULES\n  // ────────────────────────────────────────────────────────────────\n  await fastify.register(AutoLoad, {\n    dir: path.join(__dirname, 'aop_modules'),\n    encapsulate: false,\n    maxDepth: 1,\n    dirNameRoutePrefix: false,\n    prefix: '/api',\n    options: Object.assign({}, opts),\n  });\n\n  await fastify.register(AutoLoad, {\n    dir: path.join(__dirname, 'business_modules'),\n    encapsulate: true,\n    maxDepth: 1,\n    dirNameRoutePrefix: false,\n    prefix: '/api',\n    options: Object.assign({}, opts),\n  });\n\n  // Debug route\n  fastify.get('/debug/clear-state-cookie', (req, reply) => {\n    reply.clearCookie('oauth2-redirect-state', { path: '/' });\n    reply.send({ message: 'cleared' });\n  });\n\n  await fastify.register(fastifySwaggerUI, {\n    routePrefix: '/api/doc',\n    staticCSP: true, // Enable static CSP headers for the UI\n    uiConfig: {\n      docExpansion: 'list',\n      deepLinking: true,\n      defaultModelsExpandDepth: 2,\n      defaultModelExpandDepth: 2,\n      defaultModelRendering: 'example',\n      displayRequestDuration: true,\n      filter: true,\n      tryItOutEnabled: true,\n      persistAuthorization: true,\n      layout: 'StandaloneLayout',\n      // Custom CSS for better aesthetics\n      customCss: `\n        .swagger-ui .topbar{display:none;}\n        .swagger-ui .info .title{color:#1f2937;}\n        .swagger-ui .scheme-container{background:#f8f9fa;padding:10px;border-radius:4px;}\n        .swagger-ui .info .description {font-size: 14px; line-height: 1.6;}\n        .swagger-ui .btn.authorize {background-color: #4f46e5; border-color: #4f46e5;}\n        .swagger-ui .btn.authorize:hover {background-color: #4338ca;}\n      `,\n      customSiteTitle: 'EventStorm.me API Docs',\n      customfavIcon: '/favicon.ico',\n      // Optional: Add request/response interceptors for debugging Swagger UI calls\n      requestInterceptor: req => {\n        console.log('🌐 Swagger UI Request:', {\n          url: req.url, method: req.method, headers: req.headers\n        });\n        return req;\n      },\n      responseInterceptor: res => {\n        console.log('📡 Swagger UI Response:', {\n          url: res.url, status: res.status, statusText: res.statusText\n        });\n        return res;\n      }\n    },\n    // Transform CSP headers for Swagger UI to allow necessary external resources and inline styles/scripts\n    transformStaticCSP: (hdr) => {\n      let newHdr = hdr.replace(\n        /default-src 'self'/g,\n        \"default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:\"\n      );\n      // Add connect-src directives based on environment for local development\n      if (process.env.NODE_ENV !== 'production') {\n        newHdr += \"; connect-src 'self' http://localhost:3000 http://localhost:5173 http://127.0.0.1:3000 ws://localhost:* wss://localhost:* https: data: blob:\";\n      } else {\n        newHdr += \"; connect-src 'self' https: wss: data: blob:\";\n      }\n      newHdr += \"; style-src 'self' 'unsafe-inline' https:\"; // Allow inline styles and HTTPS sources\n      newHdr += \"; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:\"; // Allow inline scripts, eval, and HTTPS sources\n      return newHdr;\n    },\n    transformSpecificationClone: true, // Clone the spec before transforming\n    // Transform the OpenAPI specification\n    transformSpecification(spec) {\n      spec.info['x-build-time'] = new Date().toISOString();\n      spec.info['x-builder'] = 'anatolyZader';\n      spec.info['x-environment'] = process.env.NODE_ENV || 'development';\n      spec.info['x-node-version'] = process.version; // Add Node.js version to the spec info\n\n      // Adjust server URLs for development environment\n      if (process.env.NODE_ENV !== 'production') {\n        spec.servers = [\n          { url: 'http://localhost:3000', description: 'Development server' },\n          { url: 'http://127.0.0.1:3000', description: 'Development server (alternative)' }\n        ];\n      }\n\n      spec.info['x-security-note'] = 'This API uses JWT Bearer tokens or cookie-based authentication';\n      return spec;\n    }\n  });\n\n  // fastify.after(async () => {\n  //   await fastify.register(swaggerUIPlugin);\n  // });\n\n  // ────────────────────────────────────────────────────────────────\n  // 9️⃣  READY HOOK – print summary\n  // ────────────────────────────────────────────────────────────────\n\n  fastify.addHook('onReady', async () => {\n    fastify.log.info('▶ Registered routes:\\n' + fastify.printRoutes());\n  });\n};\n",
  "content": "// app.js\n'use strict';\n/* eslint-disable no-unused-vars */\n\nconst path              = require('node:path');\nconst fs                = require('fs');\nconst AutoLoad          = require('@fastify/autoload');\nconst fastifySensible   = require('@fastify/sensible');\n\nconst fastifyCookie     = require('@fastify/cookie');\nconst fastifySession    = require('@fastify/session');\nconst { Store }         = fastifySession;\n\nconst redisPlugin       = require('./redisPlugin');\nconst websocketPlugin   = require('./websocketPlugin');\n\nconst loggingPlugin     = require('./aop_modules/log/plugins/logPlugin');\nconst schemaLoaderPlugin = require('./env_schemas/schemaLoaderPlugin');\nconst envPlugin         = require('./envPlugin');\nconst diPlugin          = require('./diPlugin');\nconst corsPlugin        = require('./corsPlugin');\nconst helmet            = require('@fastify/helmet');\nconst fastifyJwt        = require('@fastify/jwt');\nconst fastifyOAuth2     = require('@fastify/oauth2');\nconst { OAuth2Client }  = require('google-auth-library');\nconst { v4: uuidv4 }    = require('uuid');\nconst authSchemasPlugin = require('./aop_modules/auth/plugins/authSchemasPlugin');\n// const swaggerPlugin     = require('./swaggerPlugin');\n// const swaggerUIPlugin   = require('./swaggerUIPlugin');\nconst fastifySwagger    = require('@fastify/swagger');\nconst fastifySwaggerUI  = require('@fastify/swagger-ui');\n\nrequire('dotenv').config();\n\nmodule.exports = async function (fastify, opts) {\n\n  fastify.addHook('onRoute', (routeOptions) => {\n    fastify.log.info({ method: routeOptions.method, url: routeOptions.url }, 'route registered');\n  });\n\n  await fastify.register(loggingPlugin);\n  await fastify.register(schemaLoaderPlugin);\n  await fastify.register(envPlugin);\n  await fastify.register(diPlugin);\n\n  await fastify.register(websocketPlugin);\n  await fastify.register(fastifySensible);\n  await fastify.register(fastifySwagger, {\n    openapi: {\n      openapi: '3.0.0',\n      info: {\n        title: 'EventStorm.me API',\n        description:\n          'EventStorm API – Git analysis, AI insights, wiki, chat and more',\n        version: '1.0.0',\n        contact: {\n          name: 'EventStorm Support',\n          email: 'support@eventstorm.me',\n          url: 'https://eventstorm.me/support'\n        },\n        license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },\n        termsOfService: 'https://eventstorm.me/terms'\n      },\n      servers: [\n        {\n          url: process.env.NODE_ENV === 'production'\n            ? 'https://eventstorm.me'\n            : 'http://localhost:3000',\n          description: process.env.NODE_ENV === 'production'\n            ? 'Production server'\n            : 'Development server'\n        }\n      ],\n      tags: [\n        { name: 'auth', description: 'Authentication endpoints' },\n        { name: 'git', description: 'Git-analysis endpoints' },\n        { name: 'ai', description: 'AI-powered endpoints' },\n        { name: 'chat', description: 'Chat endpoints' },\n        { name: 'wiki', description: 'Wiki endpoints' },\n        { name: 'api', description: 'Utility endpoints' }\n      ],\n      components: {\n        securitySchemes: {\n          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },\n          cookieAuth: { type: 'apiKey', in: 'cookie', name: 'authToken' }\n        },\n        responses: {\n          UnauthorizedError: {\n            description: 'Authentication information is missing or invalid',\n            content: {\n              'application/json': {\n                schema: {\n                  type: 'object',\n                  properties: {\n                    error: { type: 'string' },\n                    message: { type: 'string' },\n                    statusCode: { type: 'number' }\n                  }\n                }\n              }\n            }\n          },\n          ServerError: {\n            description: 'Internal server error',\n            content: {\n              'application/json': {\n                schema: {\n                  type: 'object',\n                  properties: {\n                    error: { type: 'string' },\n                    message: { type: 'string' },\n                    statusCode: { type: 'number' }\n                  }\n                }\n              }\n            }\n          }\n        }\n      },\n      security: [{ bearerAuth: [] }, { cookieAuth: [] }]\n    },\n    exposeRoute: true // This is crucial for exposing the /openapi.json and /openapi.yaml routes\n  });\n\n  await fastify.register(helmet, {\n    global: true,\n    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },\n    contentSecurityPolicy: {\n      directives: {\n        defaultSrc: [\"'self'\", 'https://accounts.google.com/gsi/'],\n        scriptSrc: [\"'self'\", 'https://accounts.google.com/gsi/client'],\n        styleSrc: [\"'self'\", \"'unsafe-inline'\", 'https://accounts.google.com/gsi/style'],  \n        frameSrc: [\"'self'\", 'https://accounts.google.com/gsi/'],\n        connectSrc: [  \n          \"'self'\", \n          'https://accounts.google.com/gsi/',\n          // Add http for local development\n          ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000', 'http://localhost:5173'] : [])\n        ],\n      },\n    },\n  });\n\n\n  await fastify.register(corsPlugin);\n\n  fastify.log.info('🔌 Registering Redis client plugin');\n  await fastify.register(redisPlugin);\n  fastify.log.info('✅ Redis client plugin registered');\n\n  fastify.redis.on('error', (err) => {\n    fastify.log.error({ err }, 'Redis client error');\n  });\n\n  fastify.log.info('⏳ Testing Redis connection with PING…');\n  try {\n    const pong = await fastify.redis.ping();\n    fastify.log.info(`✅ Redis PING response: ${pong}`);\n  } catch (err) {\n    fastify.log.error({ err }, '❌ Redis PING failed');\n  }\n\n  // ────────────────────────────────────────────────────────────────\n  // 4️⃣  COOKIE / SESSION\n  // ────────────────────────────────────────────────────────────────\n  await fastify.register(\n    fastifyCookie,\n    {\n      secret: fastify.secrets.COOKIE_SECRET,\n      parseOptions: { secure: true, httpOnly: true, sameSite: 'None' },\n    },\n    { encapsulate: false }\n  );\n\n  class RedisStore extends Store {\n    constructor(sendCommand) {\n      super();\n      this.send = sendCommand;\n    }\n    get(sid, cb) {\n      this.send(['GET', sid])\n        .then((data) => cb(null, data ? JSON.parse(data) : null))\n        .catch(cb);\n    }\n    set(sid, sess, ttlMs, cb) {\n      const data = JSON.stringify(sess);\n      const ttl  = typeof ttlMs === 'number' ? Math.ceil(ttlMs / 1000) : undefined;\n      const cmd  = ttl ? ['SETEX', sid, ttl, data] : ['SET', sid, data];\n      this.send(cmd).then(() => cb(null)).catch(cb);\n    }\n    destroy(sid, cb) {\n      this.send(['DEL', sid]).then(() => cb(null)).catch(cb);\n    }\n  }\n\n  await fastify.register(fastifySession, {\n    secret: fastify.secrets.SESSION_SECRET,\n    cookie: { secure: true, maxAge: 86400000, httpOnly: true, sameSite: 'None' },\n    store: new RedisStore(fastify.redis.sendCommand.bind(fastify.redis)),\n    saveUninitialized: false,\n  });\n\n  // ────────────────────────────────────────────────────────────────\n  // 5️⃣  HEALTH ROUTE\n  // ────────────────────────────────────────────────────────────────\n  fastify.get('/', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));\n\n  // ────────────────────────────────────────────────────────────────\n  // 6️⃣  GOOGLE OAUTH + JWT (UNCHANGED FROM ORIGINAL)\n  // ────────────────────────────────────────────────────────────────\n  let credentialsJsonString, clientId, clientSecret;\n\n  if (\n    process.env.USER_OAUTH2_CREDENTIALS &&\n    process.env.USER_OAUTH2_CREDENTIALS.startsWith('{')\n  ) {\n    credentialsJsonString = JSON.parse(process.env.USER_OAUTH2_CREDENTIALS);\n  } else if (fastify.secrets && typeof fastify.secrets.USER_OAUTH2_CREDENTIALS === 'string') {\n    const credentialsPath = fastify.secrets.USER_OAUTH2_CREDENTIALS;\n    credentialsJsonString = JSON.parse(\n      await fs.promises.readFile(credentialsPath, { encoding: 'utf8' })\n    );\n  } else {\n    clientId = process.env.FALLBACK_CLIENT_ID;\n    clientSecret = process.env.FALLBACK_CLIENT_SECRET;\n  }\n\n  if (credentialsJsonString) {\n    clientId = credentialsJsonString.web.client_id;\n    clientSecret = credentialsJsonString.web.client_secret;\n  }\n\n  const revokedTokens = new Map();\n\n  fastify.register(fastifyJwt, {\n    secret: fastify.secrets.JWT_SECRET,\n    sign: { expiresIn: fastify.secrets.JWT_EXPIRE_IN },\n    verify: { requestProperty: 'user' },\n    trusted(request, decoded) {\n      return !revokedTokens.has(decoded.jti);\n    },\n  });\n\n  fastify.decorate('verifyToken', async function (request) {\n    let token = request.cookies?.authToken;\n    if (!token && request.headers.authorization) {\n      const [scheme, value] = request.headers.authorization.split(' ');\n      if (scheme === 'Bearer') token = value;\n    }\n    if (!token) throw fastify.httpErrors.unauthorized('Missing token');\n    request.user = await fastify.jwt.verify(token);\n  });\n\n  fastify.decorateRequest('revokeToken', function () {\n    if (!this.user?.jti) throw this.httpErrors.unauthorized('Missing jti');\n    revokedTokens.set(this.user.jti, true);\n  });\n\n  fastify.decorateRequest('generateToken', async function () {\n    return fastify.jwt.sign(\n      { id: String(this.user.id), username: this.user.username },\n      { jwtid: uuidv4(), expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }\n    );\n  });\n\n  const cookieSecure   = process.env.NODE_ENV === 'production';\n  const cookieSameSite = cookieSecure ? 'None' : 'Lax';\n  const googleCallbackUri =\n    cookieSecure\n      ? 'https://eventstorm.me/api/auth/google/callback'\n      : 'http://localhost:3000/api/auth/google/callback';\n\n  await fastify.register(\n    fastifyOAuth2,\n    {\n      name: 'googleOAuth2',\n      scope: ['profile', 'email', 'openid'],\n      cookie: { secure: cookieSecure, sameSite: cookieSameSite, httpOnly: true },\n      credentials: {\n        client: { id: clientId, secret: clientSecret },\n        auth: fastifyOAuth2.GOOGLE_CONFIGURATION,\n      },\n      startRedirectPath: '/api/auth/google',\n      callbackUri: googleCallbackUri,\n    },\n    { encapsulate: false }\n  );\n\n  const googleClient = new OAuth2Client(clientId);\n  fastify.decorate('verifyGoogleIdToken', async (idToken) => {\n    const ticket = await googleClient.verifyIdToken({ idToken, audience: clientId });\n    return ticket.getPayload();\n  });\n\n  await fastify.register(authSchemasPlugin);\n\n  fastify.get('/api/auth/google/callback', async (req, reply) => {\n    const token            = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);\n    const googleAccessToken = token.token.access_token;\n\n    const userService = await req.diScope.resolve('userService');\n    const googleUser  = await userService.loginWithGoogle(googleAccessToken);\n    if (!googleUser) return reply.unauthorized('Google profile invalid');\n\n    const jti  = uuidv4();\n    const jwt  = fastify.jwt.sign(\n      { id: googleUser.id, username: googleUser.username, jti },\n      { jwtid: jti, expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }\n    );\n\n    reply.setCookie('authToken', jwt, {\n      path: '/',\n      httpOnly: true,\n      secure: cookieSecure,\n      sameSite: cookieSameSite,\n    });\n\n    reply.redirect((cookieSecure ? 'https://eventstorm.me' : 'http://localhost:5173') + '/chat');\n  });\n\n  // ────────────────────────────────────────────────────────────────\n  // 7️⃣  AUTOLOAD MODULES\n  // ────────────────────────────────────────────────────────────────\n  await fastify.register(AutoLoad, {\n    dir: path.join(__dirname, 'aop_modules'),\n    encapsulate: false,\n    maxDepth: 1,\n    dirNameRoutePrefix: false,\n    prefix: '/api',\n    options: Object.assign({}, opts),\n  });\n\n  await fastify.register(AutoLoad, {\n    dir: path.join(__dirname, 'business_modules'),\n    encapsulate: true,\n    maxDepth: 1,\n    dirNameRoutePrefix: false,\n    prefix: '/api',\n    options: Object.assign({}, opts),\n  });\n\n  // Debug route\n  fastify.get('/debug/clear-state-cookie', (req, reply) => {\n    reply.clearCookie('oauth2-redirect-state', { path: '/' });\n    reply.send({ message: 'cleared' });\n  });\n\n  await fastify.register(fastifySwaggerUI, {\n    routePrefix: '/api/doc',\n    staticCSP: true, // Enable static CSP headers for the UI\n    uiConfig: {\n      docExpansion: 'list',\n      deepLinking: true,\n      defaultModelsExpandDepth: 2,\n      defaultModelExpandDepth: 2,\n      defaultModelRendering: 'example',\n      displayRequestDuration: true,\n      filter: true,\n      tryItOutEnabled: true,\n      persistAuthorization: true,\n      layout: 'StandaloneLayout',\n      // Custom CSS for better aesthetics\n      customCss: `\n        .swagger-ui .topbar{display:none;}\n        .swagger-ui .info .title{color:#1f2937;}\n        .swagger-ui .scheme-container{background:#f8f9fa;padding:10px;border-radius:4px;}\n        .swagger-ui .info .description {font-size: 14px; line-height: 1.6;}\n        .swagger-ui .btn.authorize {background-color: #4f46e5; border-color: #4f46e5;}\n        .swagger-ui .btn.authorize:hover {background-color: #4338ca;}\n      `,\n      customSiteTitle: 'EventStorm.me API Docs',\n      customfavIcon: '/favicon.ico',\n      // Optional: Add request/response interceptors for debugging Swagger UI calls\n      requestInterceptor: req => {\n        console.log('🌐 Swagger UI Request:', {\n          url: req.url, method: req.method, headers: req.headers\n        });\n        return req;\n      },\n      responseInterceptor: res => {\n        console.log('📡 Swagger UI Response:', {\n          url: res.url, status: res.status, statusText: res.statusText\n        });\n        return res;\n      }\n    },\n    // Transform CSP headers for Swagger UI to allow necessary external resources and inline styles/scripts\n    transformStaticCSP: (hdr) => {\n      let newHdr = hdr.replace(\n        /default-src 'self'/g,\n        \"default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:\"\n      );\n      // Add connect-src directives based on environment for local development\n      if (process.env.NODE_ENV !== 'production') {\n        newHdr += \"; connect-src 'self' http://localhost:3000 http://localhost:5173 http://127.0.0.1:3000 ws://localhost:* wss://localhost:* https: data: blob:\";\n      } else {\n        newHdr += \"; connect-src 'self' https: wss: data: blob:\";\n      }\n      newHdr += \"; style-src 'self' 'unsafe-inline' https:\"; // Allow inline styles and HTTPS sources\n      newHdr += \"; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:\"; // Allow inline scripts, eval, and HTTPS sources\n      return newHdr;\n    },\n    transformSpecificationClone: true, // Clone the spec before transforming\n    // Transform the OpenAPI specification\n    transformSpecification(spec) {\n      spec.info['x-build-time'] = new Date().toISOString();\n      spec.info['x-builder'] = 'anatolyZader';\n      spec.info['x-environment'] = process.env.NODE_ENV || 'development';\n      spec.info['x-node-version'] = process.version; // Add Node.js version to the spec info\n\n      // Adjust server URLs for development environment\n      if (process.env.NODE_ENV !== 'production') {\n        spec.servers = [\n          { url: 'http://localhost:3000', description: 'Development server' },\n          { url: 'http://127.0.0.1:3000', description: 'Development server (alternative)' }\n        ];\n      }\n\n      spec.info['x-security-note'] = 'This API uses JWT Bearer tokens or cookie-based authentication';\n      return spec;\n    }\n  });\n\n  // fastify.after(async () => {\n  //   await fastify.register(swaggerUIPlugin);\n  // });\n\n  // ────────────────────────────────────────────────────────────────\n  // 9️⃣  READY HOOK – print summary\n  // ────────────────────────────────────────────────────────────────\n\n  fastify.addHook('onReady', async () => {\n    fastify.log.info('▶ Registered routes:\\n' + fastify.printRoutes());\n  });\n};\n",
  "source": "backend/app.js",
  "type": "github-code",
  "isTextSearchResult": true,
  "snippet": "// app.js\n'use strict';\n/* eslint-disable no-unused-vars */\n\nconst path              = require('node:path');\nconst fs                = require('fs');\nconst AutoLoad          = require('@fastify/autolo",
  "score": 0.5,
  "id": "text_59"
}
```

---

### Chunk 2/2
- **Source**: client/src/App.jsx
- **Type**: github-code
- **Size**: 1271 characters
- **Score**: 0.25
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**Full Content**:
```
// App.jsx

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useContext } from 'react';
import LoginPage from './components/auth_components/LoginPage';
import Chat from './components/chat_components/Chat';

import NotFound from './components/NotFound';
import { AuthProvider, AuthContext } from './components/auth_components/AuthContext';
import { ChatProvider } from './components/chat_components/ChatContext';
import './app.css';

function AppContent() {
  const { isAuthenticated, authLoading } = useContext(AuthContext);

  if (authLoading) return null; // or spinner

  // Show the LoginPage if the user is not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Show the main layout after successful login
  return (
    <div className="app-grid">
      <div className="main-section">
        <Routes>
          <Route path="/" element={<Chat />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ChatProvider>
    </AuthProvider>
  );
}

export default App;

```

**Metadata**:
```json
{
  "text": "// App.jsx\n\nimport { BrowserRouter, Route, Routes } from 'react-router-dom';\nimport { useContext } from 'react';\nimport LoginPage from './components/auth_components/LoginPage';\nimport Chat from './components/chat_components/Chat';\n\nimport NotFound from './components/NotFound';\nimport { AuthProvider, AuthContext } from './components/auth_components/AuthContext';\nimport { ChatProvider } from './components/chat_components/ChatContext';\nimport './app.css';\n\nfunction AppContent() {\n  const { isAuthenticated, authLoading } = useContext(AuthContext);\n\n  if (authLoading) return null; // or spinner\n\n  // Show the LoginPage if the user is not authenticated\n  if (!isAuthenticated) {\n    return <LoginPage />;\n  }\n\n  // Show the main layout after successful login\n  return (\n    <div className=\"app-grid\">\n      <div className=\"main-section\">\n        <Routes>\n          <Route path=\"/\" element={<Chat />} />\n          <Route path=\"/chat\" element={<Chat />} />\n          <Route path=\"*\" element={<NotFound />} />\n        </Routes>\n      </div>\n    </div>\n  );\n}\n\nfunction App() {\n  return (\n    <AuthProvider>\n      <ChatProvider>\n        <BrowserRouter>\n          <AppContent />\n        </BrowserRouter>\n      </ChatProvider>\n    </AuthProvider>\n  );\n}\n\nexport default App;\n",
  "content": "// App.jsx\n\nimport { BrowserRouter, Route, Routes } from 'react-router-dom';\nimport { useContext } from 'react';\nimport LoginPage from './components/auth_components/LoginPage';\nimport Chat from './components/chat_components/Chat';\n\nimport NotFound from './components/NotFound';\nimport { AuthProvider, AuthContext } from './components/auth_components/AuthContext';\nimport { ChatProvider } from './components/chat_components/ChatContext';\nimport './app.css';\n\nfunction AppContent() {\n  const { isAuthenticated, authLoading } = useContext(AuthContext);\n\n  if (authLoading) return null; // or spinner\n\n  // Show the LoginPage if the user is not authenticated\n  if (!isAuthenticated) {\n    return <LoginPage />;\n  }\n\n  // Show the main layout after successful login\n  return (\n    <div className=\"app-grid\">\n      <div className=\"main-section\">\n        <Routes>\n          <Route path=\"/\" element={<Chat />} />\n          <Route path=\"/chat\" element={<Chat />} />\n          <Route path=\"*\" element={<NotFound />} />\n        </Routes>\n      </div>\n    </div>\n  );\n}\n\nfunction App() {\n  return (\n    <AuthProvider>\n      <ChatProvider>\n        <BrowserRouter>\n          <AppContent />\n        </BrowserRouter>\n      </ChatProvider>\n    </AuthProvider>\n  );\n}\n\nexport default App;\n",
  "source": "client/src/App.jsx",
  "type": "github-code",
  "isTextSearchResult": true,
  "snippet": "// App.jsx\n\nimport { BrowserRouter, Route, Routes } from 'react-router-dom';\nimport { useContext } from 'react';\nimport LoginPage from './components/auth_components/LoginPage';\nimport Chat from './com",
  "score": 0.25,
  "id": "text_186"
}
```

---


## 🤖 AI Response Analysis

### Generated Response:
**Status**: ✅ Generated Successfully
**Response Length**: 1708 characters
**Generated At**: 2025-10-28T16:42:16.048Z

### Response Content:
```markdown
Based on the `backend/app.js` file provided, the root backend `app.js` file includes the following:

1. It imports several Fastify plugins such as `@fastify/autoload`, `@fastify/sensible`, `@fastify/cookie`, `@fastify/session`, and others.
2. It loads custom plugins like `redisPlugin`, `websocketPlugin`, `loggingPlugin`, `schemaLoaderPlugin`, `envPlugin`, `diPlugin`, `corsPlugin`, and `authSchemasPlugin`.
3. It sets up middleware and configurations for features like logging, environment variables, dependency injection, CORS, and authentication.
4. It does not contain any specific application logic or routing. The actual application logic is likely implemented in other files and modules that are loaded by the Fastify server.

As for the `client/src/App.jsx` file, it appears to be the main entry point for the client-side React application. It sets up the routing using `react-router-dom` and renders the main application content, including the `LoginPage` and `Chat` components.

The key things I can see in the `App.jsx` file are:

1. It imports various React components and contexts, such as `LoginPage`, `Chat`, `NotFound`, `AuthProvider`, `AuthContext`, and `ChatProvider`.
2. It defines the `AppContent` component, which checks the authentication state and renders either the `LoginPage` or the main application layout.
3. The main `App` component wraps the application with the `AuthProvider` and `ChatProvider` contexts, and renders the `AppContent` component within a `BrowserRouter`.

I don't see any references to a "src/core/di" directory or implementation in the provided code. The actual DI system appears to be implemented in the `backend/diPlugin.js` file using the Awilix framework.
```

### Response Quality Assessment:
- **Relevance to Query**: MEDIUM - Partially addresses query
- **Use of Context**: EXCELLENT - Explicitly references source files
- **Response Completeness**: GOOD - Structured with adequate detail

### Key Response Elements:
- **Structured Lists**: 7 numbered points
- **File References**: 5 specific files mentioned
- **Technical Terms**: 3 technical concepts used

---


## 📈 Performance Metrics

### Search Efficiency:
- **Query Processing Time**: 4370ms
- **Documents Retrieved**: 2
- **Unique Sources**: 2
- **Average Chunk Size**: 8586 characters

### Context Quality:
- **Relevance Score**: HIGH (2 relevant chunks found)
- **Diversity Score**: GOOD (2 unique sources)
- **Completeness Score**: HIGH (17,171 total characters)

### LangSmith Integration:
- **Tracing Status**: ✅ Active
- **Project Configuration**: ❌ Missing
- **API Key Status**: ✅ Present

## 🔍 Source Analysis

### Most Frequent Sources:
- **backend/app.js**: 1 chunks
- **client/src/App.jsx**: 1 chunks

### Repository Coverage:
- No repository sources detected

## 🎯 Query Classification & Analysis

- **Query Type**: Informational/Explanatory
- **Domain Focus**: General Application
- **Technical Complexity**: High
- **Expected Response Type**: Explanatory

## 🚀 Recommendations

- **Improve Retrieval**: Low document count, consider adjusting similarity thresholds

## ✨ Conclusion

This comprehensive LangSmith trace demonstrates adequate RAG performance with:
- **Retrieval Quality**: Needs Improvement
- **Context Diversity**: Medium
- **Content Richness**: Very High
- **Response Quality**: Comprehensive

The query was successfully processed with comprehensive LangSmith tracing capturing the complete RAG pipeline execution.

---
**Generated**: 2025-10-28T16:42:16.049Z  
**LangSmith Project**: eventstorm-trace  
**Trace Type**: Comprehensive RAG Analysis
**Auto-Generated**: true
