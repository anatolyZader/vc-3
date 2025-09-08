/* eslint-disable no-unused-vars */
// envPlugin.js
'use strict';

const fp = require('fastify-plugin');
const fastifyEnv = require('@fastify/env');

module.exports = fp(async function configLoader(fastify, opts) {
 
  const schema = fastify.getSchema('schema:dotenv');

  if (!schema) {
    throw fastify.httpErrors.internalServerError(
      'Schema "schema:dotenv" not found. Ensure it is loaded before this plugin.'
    );
  }

  try {
    await fastify.register(fastifyEnv, {
      confKey: 'secrets',  // property name under which the validated environment variables will be attached to your Fastify instance (fastify.secrets)
      schema: schema,  
    }, { name: 'env-config' });
  } catch (error) {
    throw fastify.httpErrors.internalServerError(
      'Error registering fastifyEnv for secrets',
      { cause: error }
    );
  }
});
