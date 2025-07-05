// swaggerUIPlugin.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');
const fastifySwaggerUI = require('@fastify/swagger-ui');

module.exports = fp(async function (fastify, opts) {
  console.log('🖥️ Registering @fastify/swagger-ui');
  
  try {
    await fastify.register(fastifySwaggerUI, {
      routePrefix: '/api/doc',
      staticCSP: true,
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
          .swagger-ui .info .description {font-size: 14px; line-height: 1.6;}
          .swagger-ui .btn.authorize {background-color: #4f46e5; border-color: #4f46e5;}
          .swagger-ui .btn.authorize:hover {background-color: #4338ca;}
        `,
        customSiteTitle: 'EventStorm.me API Docs',
        customfavIcon: '/favicon.ico',
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
      transformStaticCSP: (hdr) => {
        let newHdr = hdr.replace(
          /default-src 'self'/g,
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:"
        );
        if (process.env.NODE_ENV !== 'staging') {
          newHdr += "; connect-src 'self' http://localhost:3000 http://localhost:5173 http://127.0.0.1:3000 ws://localhost:* wss://localhost:* https: data: blob:";
        } else {
          newHdr += "; connect-src 'self' https: wss: data: blob:";
        }
        newHdr += "; style-src 'self' 'unsafe-inline' https:";
        newHdr += "; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:";
        return newHdr;
      },
      transformSpecificationClone: true,
      transformSpecification(spec) {
        try {
          // Ensure spec is valid
          if (!spec || typeof spec !== 'object') {
            console.error('Invalid spec object received in transformSpecification');
            spec = { 
              openapi: '3.0.0',
              info: { title: 'EventStorm API', version: '1.0.0' },
              paths: {}
            };
          }
          
          // Add metadata to the spec
          spec.info = spec.info || {};
          spec.info['x-build-time'] = new Date().toISOString();
          spec.info['x-builder'] = 'anatolyZader';
          spec.info['x-environment'] = process.env.NODE_ENV || 'development';
          spec.info['x-node-version'] = process.version;

          // Update servers for development
          if (process.env.NODE_ENV !== 'staging') {
            spec.servers = [
              { url: 'http://localhost:3000', description: 'Development server' },
              { url: 'http://127.0.0.1:3000', description: 'Development server (alternative)' }
            ];
          }

          // Add security note
          spec.info['x-security-note'] = 'This API uses JWT Bearer tokens or cookie-based authentication';
          
          // Fix potentially undefined parts of the spec
          if (!spec.paths) spec.paths = {};
          
          // Ensure paths is an object
          if (typeof spec.paths !== 'object') {
            console.warn('spec.paths is not an object, resetting it');
            spec.paths = {};
          }
          
          // Check each path and operation for undefined/null schema properties
          Object.keys(spec.paths).forEach(path => {
            try {
              const pathItem = spec.paths[path];
              if (!pathItem) return;
              
              ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].forEach(method => {
                if (!pathItem[method]) return;
                const operation = pathItem[method];
                
                // Fix potentially undefined parameters
                if (operation.parameters === undefined) {
                  operation.parameters = [];
                }
                
                // Ensure requestBody has proper structure if defined
                if (operation.requestBody && !operation.requestBody.content) {
                  console.warn(`⚠️ Invalid requestBody for ${method.toUpperCase()} ${path} - fixing`);
                  operation.requestBody.content = {
                    'application/json': {
                      schema: { type: 'object', properties: {} }
                    }
                  };
                }
              
              // Ensure responses have proper structure
              if (!operation.responses) {
                console.warn(`⚠️ Missing responses for ${method.toUpperCase()} ${path} - adding default`);
                operation.responses = {
                  '200': {
                    description: 'Successful operation'
                  }
                };
              }
              
              // Make sure operation.responses exists and is an object
              if (!operation.responses || typeof operation.responses !== 'object') {
                operation.responses = { 
                  '200': { description: 'Successful operation' } 
                };
                return;
              }
              
              Object.keys(operation.responses).forEach(statusCode => {
                const response = operation.responses[statusCode];
                if (!response) {
                  console.warn(`⚠️ Undefined response for status ${statusCode} in ${method.toUpperCase()} ${path} - removing`);
                  delete operation.responses[statusCode];
                  return;
                }
                
                if (!response.description) {
                  response.description = 'Response';
                }
                
                // Fix content if it's not an object
                if (response.content && typeof response.content !== 'object') {
                  console.warn(`⚠️ Invalid content for response ${statusCode} - fixing`);
                  response.content = {
                    'application/json': {
                      schema: { type: 'object' }
                    }
                  };
                }
              });
            });
            } catch (pathError) {
              console.error(`❌ Error processing path ${path}:`, pathError.message);
            }
          });
          
          return spec;
        } catch (error) {
          console.error('❌ Error transforming OpenAPI specification:', error);
          return spec; // Return the original spec if transformation fails
        }
      }
    });

    fastify.log.info('✅ Swagger UI ready at /api/doc');
  } catch (error) {
    fastify.log.error('❌ Error registering Swagger UI plugin:', error);
    throw error;
  }
}, { name: 'swaggerUIPlugin', encapsulate: false });
