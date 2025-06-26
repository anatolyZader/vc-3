// swaggerPlugin.js
'use strict';
/* eslint-disable no-unused-vars */

// Import necessary modules
const yaml = require('js-yaml'); // Required for YAML output
const fastifySwagger = require('@fastify/swagger'); // The core Swagger plugin
const fastifySwaggerUI = require('@fastify/swagger-ui'); // The Swagger UI plugin

module.exports = async function (fastify, opts) {
  console.log('--- LOADING Combined Swagger Plugin NOW ---');
  console.log(`⏰ Loading at: ${new Date().toISOString()}`);
  console.log(`👤 Current user context: anatolyZader`);

  // ────────────────────────────────────────────────────────────────
  // 1️⃣ Register @fastify/swagger (spec generator) first
  // This ensures the fastify.swagger() decorator is available
  // ────────────────────────────────────────────────────────────────
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
          url: process.env.NODE_ENV === 'staging'
            ? 'https://eventstorm.me'
            : 'http://localhost:3000',
          description: process.env.NODE_ENV === 'staging'
            ? 'staging server'
            : 'Development server'
        }
      ],
      tags: [
        { name: 'auth', description: 'Authentication endpoints' },
        { name: 'git', description: 'Git-analysis endpoints' },
        { name: 'ai', description: 'AI-powered endpoints' },
        { name: 'chat', description: 'Chat endpoints' },
        { name: 'wiki', description: 'Wiki endpoints' },
        { name: 'api', description: 'Utility endpoints' },
        { name: 'reqs', description: 'Reqs endpoints' },
        { name: 'pm', description: 'PM endpoints' },
      
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

  console.log('✅ @fastify/swagger registered');

  // ────────────────────────────────────────────────────────────────
  // 2️⃣ Register @fastify/swagger-ui after @fastify/swagger
  // Placing it directly here ensures @fastify/swagger is fully loaded.
  // We do NOT use fastify.after() here, as both plugins need to be available
  // on the same Fastify instance and their internal registration promises resolved.
  // ────────────────────────────────────────────────────────────────
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
      if (process.env.NODE_ENV !== 'staging') {
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
      if (process.env.NODE_ENV !== 'staging') {
        spec.servers = [
          { url: 'http://localhost:3000', description: 'Development server' },
          { url: 'http://127.0.0.1:3000', description: 'Development server (alternative)' }
        ];
      }

      spec.info['x-security-note'] = 'This API uses JWT Bearer tokens or cookie-based authentication';
      return spec;
    }
  });

  console.log('✅ @fastify/swagger-ui registered');
  console.log('📖 Docs at /api/doc');


  // ────────────────────────────────────────────────────────────────
  // 3️⃣ Print statistics (must be inside onReady hook)
  // This hook runs after all routes and plugins are loaded
  // ────────────────────────────────────────────────────────────────
  fastify.addHook('onReady', async () => {
    const spec = fastify.swagger(); // Access the generated Swagger specification
    const pathCount = Object.keys(spec.paths || {}).length;
    const tagCount = spec.tags ? spec.tags.length : 0;
    console.log(`✅ OpenAPI spec has ${pathCount} paths across ${tagCount} tags`);
    console.log('📊 API Tags:', spec.tags?.map(tag => tag.name).join(', '));
    console.log('🌍 Server URL:', spec.servers?.[0]?.url);
  });

  // ────────────────────────────────────────────────────────────────
  // 4️⃣ Download routes + health check + debug CSP
  // These routes expose the OpenAPI spec and other utility info
  // ────────────────────────────────────────────────────────────────
  fastify.get('/api/openapi.json', async (req, reply) => {
    const spec = fastify.swagger();
    spec.info['x-downloaded-at'] = new Date().toISOString();
    spec.info['x-downloaded-by'] = 'anatolyZader'; // Add custom info
    reply.header('Content-Disposition',
      'attachment; filename="eventstorm-api-spec.json"');
    return spec;
  });

  fastify.get('/api/openapi.yaml', async (req, reply) => {
    // yaml is already imported at the top of the file
    const spec = fastify.swagger();
    spec.info['x-downloaded-at'] = new Date().toISOString();
    spec.info['x-downloaded-by'] = 'anatolyZader'; // Add custom info
    reply.type('text/yaml');
    reply.header('Content-Disposition',
      'attachment; filename="eventstorm-api-spec.yaml"');
    return yaml.dump(spec, { indent: 2, lineWidth: 120, noRefs: true });
  });

  fastify.get('/api/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0', // Ensure version is displayed
    user: 'anatolyZader' // Ensure user is displayed
  }));

  fastify.get('/api/debug/csp', async (req, reply) => {
    const cspHeader = reply.getHeader('content-security-policy');
    return {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      cspHeader: cspHeader || 'No CSP header found', // Informative message if CSP header is missing
      userAgent: req.headers['user-agent'],
      origin: req.headers.origin,
      host: req.headers.host,
      referer: req.headers.referer
    };
  });
};

// This ensures that the decorators (like fastify.swagger()) and routes
// are available on the main Fastify instance, not just within this plugin's scope.
module.exports.encapsulate = false;
