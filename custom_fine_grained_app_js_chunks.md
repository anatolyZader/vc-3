# app.js - Custom Fine-Grained AST Chunks

**Configuration:** Custom fine-grained AST splitting (max 500 tokens)
**Generated:** 2025-10-11T13:57:59.577Z
**Total Chunks:** 36
**Average Size:** 66 tokens

## Chunk 1: call_expression (40 tokens)

**Tokens:** 40
**Lines:** 27-30

```javascript

  fastify.addHook('onRoute', (routeOptions) => {
    fastify.log.info({ method: routeOptions.method, url: routeOptions.url }, 'route registered');
  });
```

---

## Chunk 2: call_expression (22 tokens)

**Tokens:** 22
**Lines:** 29-29

```javascript
    fastify.log.info({ method: routeOptions.method, url: routeOptions.url }, 'route registered');
```

---

## Chunk 3: call_expression (9 tokens)

**Tokens:** 9
**Lines:** 31-32

```javascript

  await fastify.register(loggingPlugin);
```

---

## Chunk 4: call_expression (9 tokens)

**Tokens:** 9
**Lines:** 33-33

```javascript
  await fastify.register(schemaLoaderPlugin);
```

---

## Chunk 5: call_expression (8 tokens)

**Tokens:** 8
**Lines:** 34-34

```javascript
  await fastify.register(envPlugin);
```

---

## Chunk 6: call_expression (8 tokens)

**Tokens:** 8
**Lines:** 35-35

```javascript
  await fastify.register(diPlugin);
```

---

## Chunk 7: call_expression (9 tokens)

**Tokens:** 9
**Lines:** 36-36

```javascript
  await fastify.register(websocketPlugin);
```

---

## Chunk 8: call_expression (11 tokens)

**Tokens:** 11
**Lines:** 37-37

```javascript
  await fastify.register(fastifySensible);
```

---

## Chunk 9: call_expression (54 tokens)

**Tokens:** 54
**Lines:** 38-44

```javascript

  await fastify.register(require('@fastify/multipart'), {
    // Allow files up to 10MB (for voice recordings)
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB
    }
  });
```

---

## Chunk 10: call_expression (9 tokens)

**Tokens:** 9
**Lines:** 45-46

```javascript
  
  await fastify.register(eventDispatcher);
```

---

## Chunk 11: call_expression (9 tokens)

**Tokens:** 9
**Lines:** 49-49

```javascript
    await fastify.register(pubsubPlugin);
```

---

## Chunk 12: call_expression (301 tokens)

**Tokens:** 301
**Lines:** 51-70

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

## Chunk 13: call_expression (9 tokens)

**Tokens:** 9
**Lines:** 71-72

```javascript

  await fastify.register(corsPlugin);
```

---

## Chunk 14: call_expression (10 tokens)

**Tokens:** 10
**Lines:** 73-73

```javascript
  await fastify.register(require('./swaggerPlugin'));
```

---

## Chunk 15: call_expression (8 tokens)

**Tokens:** 8
**Lines:** 76-76

```javascript
    await fastify.register(redisPlugin);
```

---

## Chunk 16: call_expression (28 tokens)

**Tokens:** 28
**Lines:** 77-79

```javascript
    fastify.redis.on('error', (err) => {
      fastify.log.error({ err }, 'Redis client error');
    });
```

---

## Chunk 17: call_expression (13 tokens)

**Tokens:** 13
**Lines:** 78-78

```javascript
      fastify.log.error({ err }, 'Redis client error');
```

---

## Chunk 18: call_expression (17 tokens)

**Tokens:** 17
**Lines:** 80-80

```javascript
    fastify.log.info('⏳ Testing Redis connection with PING…');
```

---

## Chunk 19: call_expression (10 tokens)

**Tokens:** 10
**Lines:** 82-82

```javascript
      const pong = await fastify.redis.ping();
```

---

## Chunk 20: call_expression (17 tokens)

**Tokens:** 17
**Lines:** 83-83

```javascript
      fastify.log.info(`✅ Redis PING response: ${pong}`);
```

---

## Chunk 21: call_expression (16 tokens)

**Tokens:** 16
**Lines:** 85-85

```javascript
      fastify.log.error({ err }, '❌ Redis PING failed');
```

---

## Chunk 22: call_expression (118 tokens)

**Tokens:** 118
**Lines:** 90-100

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

## Chunk 23: call_expression (95 tokens)

**Tokens:** 95
**Lines:** 104-109

```javascript
    await fastify.register(fastifySession, {
    secret: fastify.secrets.SESSION_SECRET,
    cookie: { secure: true, maxAge: 86400000, httpOnly: true, sameSite: 'None' },
    store: new RedisStore(fastify.redis.sendCommand.bind(fastify.redis)), // where session data is stored.
    saveUninitialized: false, // Do not create session until something stored in session.
  });
```

---

## Chunk 24: call_expression (135 tokens)

**Tokens:** 135
**Lines:** 111-129

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

## Chunk 25: call_expression (141 tokens)

**Tokens:** 141
**Lines:** 130-151

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

## Chunk 26: call_expression (97 tokens)

**Tokens:** 97
**Lines:** 152-163

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

## Chunk 27: call_expression (59 tokens)

**Tokens:** 59
**Lines:** 164-172

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

## Chunk 28: call_expression (137 tokens)

**Tokens:** 137
**Lines:** 173-191

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

## Chunk 29: call_expression (144 tokens)

**Tokens:** 144
**Lines:** 192-216

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

## Chunk 30: call_expression (147 tokens)

**Tokens:** 147
**Lines:** 217-241

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

## Chunk 31: call_expression (295 tokens)

**Tokens:** 295
**Lines:** 242-294

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

## Chunk 32: call_expression (66 tokens)

**Tokens:** 66
**Lines:** 283-291

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

## Chunk 33: call_expression (265 tokens)

**Tokens:** 265
**Lines:** 295-322

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

## Chunk 34: call_expression (11 tokens)

**Tokens:** 11
**Lines:** 323-324

```javascript

  await fastify.register(require('./swaggerUI'));
```

---

## Chunk 35: call_expression (35 tokens)

**Tokens:** 35
**Lines:** 325-329

```javascript

  fastify.addHook('onReady', async () => {

    fastify.log.info('▶ Registered routes:\n' + fastify.printRoutes());
  });
```

---

## Chunk 36: call_expression (20 tokens)

**Tokens:** 20
**Lines:** 327-328

```javascript

    fastify.log.info('▶ Registered routes:\n' + fastify.printRoutes());
```

---

