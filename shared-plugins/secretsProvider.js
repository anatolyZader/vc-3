'use strict'

const fp = require('fastify-plugin')

// eslint-disable-next-line no-unused-vars
module.exports = fp(async function secretsProvider (fastify, opts) {
    
    fastify.decorate('getEnvVar', function (varName) {
        if (!varName) {
          throw new Error('Environment variable name must be provided');
        }
        return fastify.secrets.varName
        // return this.config[varName];
      });
  })

