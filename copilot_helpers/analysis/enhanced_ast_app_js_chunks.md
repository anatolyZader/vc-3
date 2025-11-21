# app.js - Enhanced AST Semantic Chunks

**Configuration:** Enhanced AST splitting with Fastify rules
**Max Tokens:** 500
**Generated:** 2025-10-11T14:12:05.732Z
**Total Chunks:** 29
**Fastify Chunks:** 0
**Average Size:** 82 tokens

## Chunk 1: unknown (62 tokens)

**Tokens:** 62
**Type:** unknown

```javascript

  fastify.addHook('onRoute', (routeOptions) => {
    fastify.log.info({ method: routeOptions.method, url: routeOptions.url }, 'route registered');
  });

    fastify.log.info({ method: routeOptions.method, url: routeOptions.url }, 'route registered');
```

---

## Chunk 2: unknown (9 tokens)

**Tokens:** 9
**Type:** unknown

```javascript

  await fastify.register(loggingPlugin);
```

---

## Chunk 3: unknown (9 tokens)

**Tokens:** 9
**Type:** unknown

```javascript
  await fastify.register(schemaLoaderPlugin);
```

---

## Chunk 4: unknown (8 tokens)

**Tokens:** 8
**Type:** unknown

```javascript
  await fastify.register(envPlugin);
```

---

## Chunk 5: unknown (8 tokens)

**Tokens:** 8
**Type:** unknown

```javascript
  await fastify.register(diPlugin);
```

---

## Chunk 6: unknown (9 tokens)

**Tokens:** 9
**Type:** unknown

```javascript
  await fastify.register(websocketPlugin);
```

---

## Chunk 7: unknown (11 tokens)

**Tokens:** 11
**Type:** unknown

```javascript
  await fastify.register(fastifySensible);
```

---

## Chunk 8: unknown (54 tokens)

**Tokens:** 54
**Type:** unknown

```javascript

  await fastify.register(require('@fastify/multipart'), {
    // Allow files up to 10MB (for voice recordings)
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB
    }
  });
```

---

## Chunk 9: unknown (9 tokens)

**Tokens:** 9
**Type:** unknown

```javascript
  
  await fastify.register(eventDispatcher);
```

---

## Chunk 10: unknown (9 tokens)

**Tokens:** 9
**Type:** unknown

```javascript
    await fastify.register(pubsubPlugin);
```

---

## Chunk 11: unknown (301 tokens)

**Tokens:** 301
**Type:** unknown

```javascript
  
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
```

---

## Chunk 12: unknown (9 tokens)

**Tokens:** 9
**Type:** unknown

```javascript

  await fastify.register(corsPlugin);
```

---

## Chunk 13: unknown (10 tokens)

**Tokens:** 10
**Type:** unknown

```javascript
  await fastify.register(require('./swaggerPlugin'));
```

---

## Chunk 14: unknown (8 tokens)

**Tokens:** 8
**Type:** unknown

```javascript
    await fastify.register(redisPlugin);
```

---

## Chunk 15: unknown (100 tokens)

**Tokens:** 100
**Type:** unknown

```javascript
    fastify.redis.on('error', (err) => {
      fastify.log.error({ err }, 'Redis client error');
    });

      fastify.log.error({ err }, 'Redis client error');

    fastify.log.info('⏳ Testing Redis connection with PING…');

      const pong = await fastify.redis.ping();

      fastify.log.info(`✅ Redis PING response: ${pong}`);

      fastify.log.error({ err }, '❌ Redis PING failed');
```

---

## Chunk 16: unknown (118 tokens)

**Tokens:** 118
**Type:** unknown

```javascript
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
```

---

## Chunk 17: unknown (95 tokens)

**Tokens:** 95
**Type:** unknown

```javascript
    await fastify.register(fastifySession, {
    secret: fastify.secrets.SESSION_SECRET,
    cookie: { secure: true, maxAge: 86400000, httpOnly: true, sameSite: 'None' },
    store: new RedisStore(fastify.redis.sendCommand.bind(fastify.redis)), // where session data is stored.
    saveUninitialized: false, // Do not create session until something stored in session.
  });
```

---

## Chunk 18: unknown (135 tokens)

**Tokens:** 135
**Type:** unknown

```javascript

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
```

---

## Chunk 19: unknown (141 tokens)

**Tokens:** 141
**Type:** unknown

```javascript

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
```

---

## Chunk 20: unknown (97 tokens)

**Tokens:** 97
**Type:** unknown

```javascript

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
```

---

## Chunk 21: unknown (59 tokens)

**Tokens:** 59
**Type:** unknown

```javascript

  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'business_modules'),
    encapsulate: true,
    maxDepth: 1,
    dirNameRoutePrefix: false,
    prefix: '/api',
    options: { ...opts},
  });
```

---

## Chunk 22: unknown (137 tokens)

**Tokens:** 137
**Type:** unknown

```javascript

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
```

---

## Chunk 23: unknown (144 tokens)

**Tokens:** 144
**Type:** unknown

```javascript

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
```

---

## Chunk 24: unknown (147 tokens)

**Tokens:** 147
**Type:** unknown

```javascript

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
```

---

## Chunk 25: unknown (295 tokens)

**Tokens:** 295
**Type:** unknown

```javascript

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
```

---

## Chunk 26: unknown (66 tokens)

**Tokens:** 66
**Type:** unknown

```javascript
  const routes = fastify.routes.map(route => ({
    method: route.method,
    url: route.url,
    schema: route.schema ? { 
      exists: true, 
      hasType: route.schema.type !== undefined,
      id: route.schema.$id
    } : { exists: false }
  }));
```

---

## Chunk 27: unknown (265 tokens)

**Tokens:** 265
**Type:** unknown

```javascript

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
```

---

## Chunk 28: unknown (11 tokens)

**Tokens:** 11
**Type:** unknown

```javascript

  await fastify.register(require('./swaggerUI'));
```

---

## Chunk 29: unknown (54 tokens)

**Tokens:** 54
**Type:** unknown

```javascript

  fastify.addHook('onReady', async () => {

    fastify.log.info('▶ Registered routes:\n' + fastify.printRoutes());
  });


    fastify.log.info('▶ Registered routes:\n' + fastify.printRoutes());
```

---

