'use strict'

const fp = require('fastify-plugin')

// eslint-disable-next-line no-unused-vars
module.exports = fp(async function dependencyProvider (fastify, opts) {
    fastify.decorate('getDependency', function (dependencyName) {
        if (!dependencyName) {
          throw new Error('Environment variable name must be provided');
        }
        return fastify.diContainer.resolve(String(dependencyName))

      });
  })

