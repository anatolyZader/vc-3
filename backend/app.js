// app.js
'use strict';
/* eslint-disable no-unused-vars */

const BUILDING_API_SPEC = process.env.GENERATING_HTTP_API_SPEC === '1';

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
// const authSchemasPlugin = require('./aop_modules/auth/plugins/authSchemasPlugin');
const schemasCheckPlugin = require('./schemasCheckPlugin');
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

  await fastify.register(require('@fastify/multipart'), {
    // Allow files up to 10MB (for voice recordings)
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB
    }
  });
  
  await fastify.register(eventDispatcher);
  
  if (!BUILDING_API_SPEC) {
    await fastify.register(pubsubPlugin);
  }
  
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
  
  // Swagger (OpenAPI) plugin
  await fastify.register(require('./swaggerPlugin'));

  // await fastify.register(require('@fastify/swagger'), {
  //   openapi: {
  //     openapi: '3.0.0',
  //     info: {
  //       title: 'eventstorm.me',
  //       description: 'http API',
  //       version: '0.0.1',
  //     },
  //     servers: [
  //       {
  //         url: process.env.NODE_ENV === 'staging'
  //           ? 'https://eventstorm.me'
  //           : 'http://localhost:3000',
  //         description: process.env.NODE_ENV === 'staging'
  //           ? 'Production server'
  //           : 'Development server',
  //       },
  //     ],
  //     components: {
  //       securitySchemes: {
  //         bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
  //         cookieAuth: { type: 'apiKey', in: 'cookie', name: 'authToken' },
  //       },
  //     },
  //     security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  //   },
  //   transform: ({ schema, url }) => {
  //     // Create a safe clone to avoid modifying the original schema
  //     if (!schema) {
  //       return {
  //         schema: { type: 'object' },
  //         url
  //       };
  //     }

  //     // Deep clone the schema
  //     const safeSchema = JSON.parse(JSON.stringify(schema));
      
  //     // Ensure root schema has a type
  //     if (!safeSchema.type) {
  //       safeSchema.type = 'object';
  //     }
      
  //     // Handle response schemas - ensure each one has a type
  //     if (safeSchema.response) {
  //       Object.keys(safeSchema.response).forEach(statusCode => {
  //         const response = safeSchema.response[statusCode];
  //         if (response && typeof response === 'object' && !response.type) {
  //           safeSchema.response[statusCode].type = 'object';
  //         }
  //       });
  //     }
      
  //     // Handle request parts - each should have a type
  //     ['params', 'querystring', 'headers', 'body'].forEach(part => {
  //       if (safeSchema[part] && typeof safeSchema[part] === 'object' && !safeSchema[part].type) {
  //         safeSchema[part].type = 'object';
  //       }
  //     });
      
  //     return { schema: safeSchema, url };
  //   },
  //   mode: 'dynamic'
  // });

  // await fastify.register(require('@fastify/swagger'), {
  //   openapi: {
  //     openapi: '3.0.0',
  //     info: {
  //       title: 'eventstorm.me',
  //       description: 'http API',
  //       version: '0.0.1',
  //     },
  //     servers: [
  //       {
  //         url: process.env.NODE_ENV === 'production'
  //           ? 'https://eventstorm.me'
  //           : 'http://localhost:3000',
  //         description: process.env.NODE_ENV === 'production'
  //           ? 'Production server'
  //           : 'Development server',
  //       },
  //     ],
  //     components: {
  //       securitySchemes: {
  //         bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
  //         cookieAuth: { type: 'apiKey', in: 'cookie', name: 'authToken' },
  //       },
  //     },
  //     security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  //   },
  //   // Add transform to handle any schema issues
  //   transform: (schema) => {
  //     if (!schema) return schema;
      
  //     // Ensure all schema objects have a type
  //     if (!schema.type) schema.type = 'object';
      
  //     // Ensure these schema properties exist and are objects
  //     if (schema.params === undefined) schema.params = {};
  //     if (schema.querystring === undefined) schema.querystring = {};
  //     if (schema.body === undefined) schema.body = {};
      
  //     return schema;
  //   }
  // });

    
  // await fastify.register(swaggerPlugin);
  // await fastify.register(swaggerUIPlugin);

  if (!BUILDING_API_SPEC) {
    await fastify.register(redisPlugin);
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
  }

  if (!BUILDING_API_SPEC) {
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
  }

  if (!BUILDING_API_SPEC) {
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
  }

  // ────────────────────────────────────────────────────────────────
  // HEALTH ROUTE
  // ────────────────────────────────────────────────────────────────
  fastify.get('/', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          },
          required: ['status', 'timestamp'],
          additionalProperties: false
        }
      }
    }
  }, async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Dedicateddd health check endpoint
  fastify.get('/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            version: { type: 'string' }
          },
          required: ['status', 'timestamp'],
          additionalProperties: false
        }
      }
    }
  }, async () => ({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  }));

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

  fastify.get('/api/debug/swagger-routes', async (request, reply) => {
  try {
    const spec = fastify.swagger();
    return {
      hasSwagger: typeof fastify.swagger === 'function',
      specKeys: Object.keys(spec),
      pathsCount: spec.paths ? Object.keys(spec.paths).length : 0,
      paths: spec.paths ? Object.keys(spec.paths) : [],
      info: spec.info || null,
      openapi: spec.openapi || null
    };
  } catch (error) {
    return {
      error: error.message,
      hasSwagger: typeof fastify.swagger === 'function'
    };
  }
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

  // Debug route to clear auth cookies
  fastify.route({
    method: 'GET',
    url: '/api/debug/clear-auth-cookie',
    handler: (req, reply) => {
      reply.clearCookie('authToken', { path: '/' });
      reply.send({ message: 'Auth cookie cleared successfully' });
    },
    schema: {
      $id: 'schema:debug:clear-auth-cookie',
      response: {
        200: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Confirmation message that the auth cookie was cleared.'
            }
          },
          additionalProperties: false
        }
      }
    }
  });

  fastify.get('/api/debug/schemas', {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          schemas: {
            type: 'object',
            additionalProperties: true
          },
          routes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                method: { type: 'string' },
                url: { type: 'string' },
                schema: {
                  type: 'object',
                  properties: {
                    exists: { type: 'boolean' },
                    hasType: { type: 'boolean' },
                    id: { type: 'string' }
                  },
                  additionalProperties: true
                }
              },
              required: ['method', 'url', 'schema'],
              additionalProperties: false
            }
          }
        },
        required: ['schemas', 'routes'],
        additionalProperties: false
      }
    }
  }
}    
  ,async (request, reply) => {
  const schemas = fastify._schemas;
  const routes = fastify.routes.map(route => ({
    method: route.method,
    url: route.url,
    schema: route.schema ? { 
      exists: true, 
      hasType: route.schema.type !== undefined,
      id: route.schema.$id
    } : { exists: false }
  }));
  
    return { schemas, routes };
  });

  // Swagger UI plugin
  await fastify.register(require('./swaggerUI'));

  fastify.addHook('onReady', async () => {

    fastify.log.info('▶ Registered routes:\n' + fastify.printRoutes());
  });
};
