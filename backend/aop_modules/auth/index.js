// aop_modules/auth/index.js
/* eslint-disable no-unused-vars */
const fp = require('fastify-plugin'); // <-- ADDED: Import fastify-plugin
const autoload = require('@fastify/autoload');
const path = require('path');

// <<< --- MODIFIED: Wrapped module.exports with fp() --- >>>
module.exports = fp(async function authModuleIndex(fastify, opts) {

  // Calculate the module-specific prefix.
  // opts.prefix will be '/api' from app.js.
  // path.basename(__dirname) will be 'auth'.
  // So, moduleSpecificPrefix will be '/api/auth'.
  const moduleSpecificPrefix = opts.prefix ? `${opts.prefix}/${path.basename(__dirname)}` : `/${path.basename(__dirname)}`;

  fastify.register(autoload, {
    dir: path.join(__dirname, 'application'),
    // options: { // REMOVED: This was commented out anyway and not needed
    //   // prefix: '/auth'
    // },
    encapsulate: false,
    maxDepth: 1,
    matchFilter: (filepath) => filepath.includes('Controller'), // Note: Changed 'path' to 'filepath' for consistency, though 'path' often works.
    prefix: moduleSpecificPrefix // <-- ADDED: Apply the calculated prefix
  });

  fastify.register(autoload, {
    dir: path.join(__dirname, 'routes'),
    encapsulate: false, // Changed from true to false for consistency, adjust if internal encapsulation is truly needed.
    // prefix: '/api', // REMOVED: This was commented out anyway and not needed
    maxDepth: 1,
    matchFilter: (filepath) => filepath.includes('Router'), // Note: Changed 'path' to 'filepath' for consistency
    dirNameRoutePrefix: false,
    prefix: moduleSpecificPrefix // <-- ADDED: Apply the calculated prefix
  });
}); // <<< --- MODIFIED: Closing parenthesis for fp() --- >>>

// <<< --- REMOVED: No longer needed with fp() and dynamic prefixing --- >>>
// module.exports.autoPrefix = '/auth';