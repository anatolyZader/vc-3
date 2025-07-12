'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function schemasCheckPlugin(fastify, opts) {
  console.log('🔍 Running Swagger schema diagnostic plugin');
  
  // Wait for all routes to be registered
  fastify.addHook('onReady', async () => {
    console.log('🔎 Checking for potentially problematic schemas...');
    const issues = [];
    
    try {
      // Get all registered routes safely using printRoutes
      const routesStr = fastify.printRoutes();
      const routeLines = routesStr.split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => {
          // Parse each line of the routes printout
          const match = line.match(/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(.+)$/);
          if (match) {
            const method = match[1];
            const url = match[2].trim();
            let schema = null;
            
            // Try to get the schema for this route
            try {
              schema = fastify.getSchema(`${method}:${url}`);
            } catch (e) {
              // Ignore schema retrieval errors
            }
            
            return { 
              method, 
              url,
              schema 
            };
          }
          return null;
        })
        .filter(Boolean);
      
      // Analyze each route's schema
      routeLines.forEach(route => {
        const { method, url, schema } = route;
        
        if (!schema) {
          issues.push({ 
            severity: 'warning', 
            message: `Route missing schema: ${method} ${url}` 
          });
          return;
        }
        
        // Check for response schema issues
        if (schema.response) {
          Object.keys(schema.response).forEach(statusCode => {
            const response = schema.response[statusCode];
            
            // Check if response is not properly defined
            if (!response) {
              issues.push({ 
                severity: 'error',
                message: `NULL response schema for status ${statusCode} in ${method} ${url}`
              });
              return;
            }
            
            // Check if response has no type but has properties (object schema)
            if (!response.type && response.properties) {
              issues.push({
                severity: 'warning',
                message: `Missing type in response schema with properties for ${method} ${url} status ${statusCode}`
              });
            }
            
            // Check if response has no type but has items (array schema)
            if (!response.type && response.items) {
              issues.push({
                severity: 'warning',
                message: `Missing type in response schema with items for ${method} ${url} status ${statusCode}`
              });
            }
            
            // Check if items exist but don't have a type
            if (response.items && typeof response.items === 'object' && !response.items.type) {
              issues.push({
                severity: 'error',
                message: `Missing type in items schema for ${method} ${url} status ${statusCode}`
              });
            }
            
            // Check if properties have missing types
            if (response.properties) {
              Object.keys(response.properties).forEach(propName => {
                const prop = response.properties[propName];
                if (typeof prop === 'object' && !prop.type) {
                  issues.push({
                    severity: 'error',
                    message: `Missing type in property '${propName}' for ${method} ${url} status ${statusCode}`
                  });
                }
              });
            }
          });
        }
        
        // Check for body schema issues
        if (schema.body) {
          const body = schema.body;
          
          // Check if body is an object without type
          if (typeof body === 'object' && !body.type && body.properties) {
            issues.push({
              severity: 'warning',
              message: `Missing type in body schema with properties for ${method} ${url}`
            });
          }
          
          // Check properties for missing types
          if (body.properties) {
            Object.keys(body.properties).forEach(propName => {
              const prop = body.properties[propName];
              if (typeof prop === 'object' && !prop.type) {
                issues.push({
                  severity: 'error',
                  message: `Missing type in body property '${propName}' for ${method} ${url}`
                });
              }
            });
          }
        }
      });
      
      // Show summary
      console.log(`\n📊 Schema diagnosis complete. Found ${issues.length} potential issues:`);
      console.log('------------------------------------------------------');
      
      const errors = issues.filter(i => i.severity === 'error');
      const warnings = issues.filter(i => i.severity === 'warning');
      
      console.log(`❌ ${errors.length} Errors that will likely break Swagger:`);
      errors.forEach((issue, i) => console.log(`  ${i+1}. ${issue.message}`));
      
      console.log(`\n⚠️ ${warnings.length} Warnings that might cause problems:`);
      warnings.forEach((issue, i) => console.log(`  ${i+1}. ${issue.message}`));
      
      console.log('------------------------------------------------------');
      console.log('To fix: Ensure all schema objects have proper "type" property.');
      console.log('For objects with "properties", add "type": "object"');
      console.log('For arrays with "items", add "type": "array"');
      console.log('For string responses, add "type": "string"');
      
    } catch (error) {
      console.error('❌ Error in schema checking plugin:', error);
    }
  });
  
  // Let the plugin continue
  return;
}, { name: 'schemasCheckPlugin' });