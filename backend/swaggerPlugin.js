'use strict';
// swaggerPlugin.js
/* eslint-disable no-unused-vars */

module.exports = async function (fastify, opts) {
  console.log('--- LOADING swaggerPlugin.js NOW ---');
  console.log(`⏰ Loading at: ${new Date().toISOString()}`);
  console.log(`👤 Current user context: anatolyZader`);

  // ────────────────────────────────────────────────────────────────
  // 1️⃣  Register spec generator immediately
  // ────────────────────────────────────────────────────────────────
  await fastify.register(require('@fastify/swagger'), {
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
        { name: 'git',  description: 'Git-analysis endpoints' },
        { name: 'ai',   description: 'AI-powered endpoints' },
        { name: 'chat', description: 'Chat endpoints' },
        { name: 'wiki', description: 'Wiki endpoints' },
        { name: 'api',  description: 'Utility endpoints' }
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          cookieAuth: { type: 'apiKey', in: 'cookie', name: 'authToken' }
        }
      },
      security: [{ bearerAuth: [] }, { cookieAuth: [] }]
    }
  });

  console.log('✅ @fastify/swagger registered');

  // ────────────────────────────────────────────────────────────────
  // 2️⃣  Register swagger-ui after all routes are in place
  // ────────────────────────────────────────────────────────────────
  fastify.after(async () => {
    await fastify.register(require('@fastify/swagger-ui'), {
      routePrefix: '/api/doc',
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
        customCss: `
          .swagger-ui .topbar{display:none;}
          .swagger-ui .info .title{color:#1f2937;}
          .swagger-ui .scheme-container{background:#f8f9fa;padding:10px;border-radius:4px;}
        `,
        customSiteTitle: 'EventStorm.me API Docs',
        customfavIcon: '/favicon.ico'
      },
      staticCSP: true,
      transformStaticCSP: h =>
        h.replace(/default-src 'self'/,
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: https:"),
      transformSpecification(spec) {
        spec.info['x-build-time'] = new Date().toISOString();
        spec.info['x-builder'] = 'anatolyZader';
        return spec;
      },
      transformSpecificationClone: true
    });

    console.log('✅ @fastify/swagger-ui registered (after)');
    console.log('📖 Docs at /api/doc');
  });

  // ────────────────────────────────────────────────────────────────
  // 3️⃣  Print statistics (must be inside onReady)
  // ────────────────────────────────────────────────────────────────
  fastify.addHook('onReady', async () => {
    const spec = fastify.swagger();
    console.log(`✅ OpenAPI spec has ${Object.keys(spec.paths || {}).length} paths`);
  });

  // ────────────────────────────────────────────────────────────────
  // 4️⃣  Download routes + health check
  // ────────────────────────────────────────────────────────────────
  fastify.get('/api/openapi.json', async (req, reply) => {
    const spec = fastify.swagger();
    spec.info['x-downloaded-at'] = new Date().toISOString();
    reply.header('Content-Disposition',
      'attachment; filename="eventstorm-api-spec.json"');
    return spec;
  });

  fastify.get('/api/openapi.yaml', async (req, reply) => {
    const yaml  = require('js-yaml');
    const spec  = fastify.swagger();
    spec.info['x-downloaded-at'] = new Date().toISOString();
    reply.type('text/yaml');
    reply.header('Content-Disposition',
      'attachment; filename="eventstorm-api-spec.yaml"');
    return yaml.dump(spec, { indent: 2, lineWidth: 120, noRefs: true });
  });

  fastify.get('/api/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }));
};

module.exports.encapsulate = false;   // keep swagger decorator global
