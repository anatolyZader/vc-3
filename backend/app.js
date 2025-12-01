// app.js
'use strict';
/* eslint-disable no-unused-vars */

const BUILDING_API_SPEC = process.env.GENERATING_HTTP_API_SPEC === '1';

const path              = require('node:path');
const AutoLoad          = require('@fastify/autoload');
const fastifySensible   = require('@fastify/sensible');
const fastifyCookie     = require('@fastify/cookie');
const fastifySession    = require('@fastify/session');
const RedisStore        = require('./redisStore');
const redisPlugin       = require('./redisPlugin');
const websocketPlugin   = require('./websocketPlugin');
const loggingPlugin     = require('./logPlugin');
const schemaLoaderPlugin = require('./env_schemas/schemaLoaderPlugin');
const envPlugin         = require('./envPlugin');
const diPlugin          = require('./diPlugin');
const corsPlugin        = require('./corsPlugin');
const helmet            = require('@fastify/helmet');
// const eventDispatcher   = require('./eventDispatcher');

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
  
  
  // Note: pubsubPlugin replaced by transportPlugin (registered after Redis)
  
  // Sets security-related HTTP headerss automatically
  await fastify.register(helmet, {
  global: true,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://accounts.google.com/gsi/client"],
      styleSrc: ["'self'", "'unsafe-inline'"], // keep inline for Swagger and GSI
      imgSrc: ["'self'", "https:", "data:", "blob:"],
      frameSrc: ["'self'", "https://accounts.google.com/gsi/"],
      connectSrc: [
        "'self'",
        "https://accounts.google.com/gsi/",
        ...(process.env.NODE_ENV !== 'production'
          ? ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "ws://localhost:*"]
          : ["https:", "wss:"])
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: []
    }
  }
});

  await fastify.register(corsPlugin);
  await fastify.register(require('./swaggerPlugin'));

  if (!BUILDING_API_SPEC) {
    await fastify.register(redisPlugin);
    
    // Only setup Redis handlers if Redis is available
    if (fastify.redis && typeof fastify.redis.on === 'function') {
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
    } else {
      fastify.log.info('ℹ️ Redis not available, running without Redis');
    }
    
    // Register transport abstraction layer
    await fastify.register(require('./transportPlugin'));
    
    // Register event dispatcher (depends on transport)
    await fastify.register(require('./eventDispatcher'));
  }

  if (!BUILDING_API_SPEC) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    await fastify.register(
      fastifyCookie,
      {
        secret: fastify.secrets.COOKIE_SECRET,
        parseOptions: { 
          secure: isProduction, // Only send cookies over HTTPS in production
          httpOnly: true, // Prevents client-side JavaScript from accessing the cookie. Helps mitigate XSS (Cross-Site Scripting) attacks.
          sameSite: isProduction ? 'None' : 'Lax' }, // Lax for local dev, None for production cross-site cookies
      },
      { encapsulate: false }
    );
  }

  if (!BUILDING_API_SPEC) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Determine session store based on Redis availability
    const sessionConfig = {
      secret: fastify.secrets.SESSION_SECRET,
      cookie: { 
        secure: isProduction, // Only HTTPS in production
        maxAge: 86400000, 
        httpOnly: true, 
        sameSite: isProduction ? 'None' : 'Lax' 
      },
      saveUninitialized: false, // Do not create session until something stored in session.
    };
    
    // Use Redis store if available, otherwise use memory store
    if (fastify.redis && typeof fastify.redis.sendCommand === 'function') {
      sessionConfig.store = new RedisStore(fastify.redis.sendCommand.bind(fastify.redis));
      fastify.log.info('📦 Using Redis session store');
    } else {
      fastify.log.warn('⚠️ Redis not available, using memory session store (not recommended for production)');
      // Memory store is the default when no store is specified
    }
    
    await fastify.register(fastifySession, sessionConfig);
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

  // Readiness check endpoint - verifies DI container is fully initialized
  // This is specifically for CI/CD workflows that need to wait for full initialization
  // Production can ignore this endpoint - it's purely for CI orchestration
  fastify.get('/ready', async () => {
    try {
      // Check if DI container is available
      if (!fastify.diContainer) {
        return { 
          ready: false, 
          reason: 'DI container not initialized - still loading',
          waitMessage: 'Please wait, system is starting up...',
          timestamp: new Date().toISOString()
        };
      }
      
      // Try to resolve critical services to verify DI is fully loaded
      const testScope = fastify.diContainer.createScope();
      
      let aiService;
      try {
        aiService = await testScope.resolve('aiService');
      } catch (resolveError) {
        return {
          ready: false,
          reason: 'AI service not yet registered in DI container',
          waitMessage: 'DI container still initializing modules...',
          error: resolveError.message,
          timestamp: new Date().toISOString()
        };
      }
      
      // Check if aiService and its dependencies are properly initialized
      const hasAiService = !!aiService;
      const hasAiAdapter = !!aiService?.aiAdapter;
      const hasPersistAdapter = !!aiService?.aiPersistAdapter;
      const isReady = hasAiService && hasAiAdapter && hasPersistAdapter;
      
      if (!isReady) {
        const missing = [];
        if (!hasAiService) missing.push('aiService');
        if (!hasAiAdapter) missing.push('aiAdapter');
        if (!hasPersistAdapter) missing.push('aiPersistAdapter');
        
        return {
          ready: false,
          reason: 'AI service dependencies still initializing',
          waitMessage: `Waiting for: ${missing.join(', ')}`,
          details: {
            aiService: hasAiService ? 'ready' : 'initializing',
            aiAdapter: hasAiAdapter ? 'ready' : 'initializing',
            aiPersistAdapter: hasPersistAdapter ? 'ready' : 'initializing'
          },
          timestamp: new Date().toISOString()
        };
      }
      
      return { 
        ready: true,
        message: 'All AI services fully initialized and ready for requests',
        services: {
          aiService: 'ready',
          aiAdapter: 'ready',
          aiPersistAdapter: 'ready'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        ready: false,
        reason: 'Unexpected error during readiness check',
        waitMessage: 'System still initializing, please wait...',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
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
    options: { ...opts},
  });

  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'business_modules'),
    encapsulate: true,
    maxDepth: 1,
    dirNameRoutePrefix: false,
    prefix: '/api',
    options: { ...opts},
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

  // LangSmith tracing diagnostics endpoint
  fastify.get('/api/debug/tracing-status', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            langsmithTracing: { type: 'boolean' },
            langsmithApiKeySet: { type: 'boolean' },
            langsmithWorkspaceIdSet: { type: 'boolean' },
            langchainProject: { type: 'string' },
            langsmithOrganizationName: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          },
          required: ['langsmithTracing', 'langsmithApiKeySet', 'timestamp'],
          additionalProperties: false
        }
      }
    }
  }, async () => ({
    langsmithTracing: process.env.LANGSMITH_TRACING === 'true',
    langsmithApiKeySet: !!process.env.LANGSMITH_API_KEY,
    langsmithWorkspaceIdSet: !!process.env.LANGSMITH_WORKSPACE_ID,
    langchainProject: process.env.LANGCHAIN_PROJECT || 'eventstorm-trace',
    langsmithOrganizationName: process.env.LANGSMITH_ORGANIZATION_NAME || 'not-set',
    timestamp: new Date().toISOString()
  }));

  await fastify.register(require('./swaggerUI'));

  fastify.addHook('onReady', async () => {

    fastify.log.info('▶ Registered routes:' + fastify.printRoutes());
  });
};
