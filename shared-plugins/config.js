// 'use strict'
const fp = require('fastify-plugin');
const fastifyEnv = require('@fastify/env');

// eslint-disable-next-line no-unused-vars
module.exports = fp(async function configLoader(fastify, opts) {
  // Ensure the schemaLoaderPlugin has been registered before this plugin
  // to make sure the schema is available in Fastify's schema store.
  
  const schema = fastify.getSchema('schema:dotenv');
  if (!schema) {
    throw new Error('Schema "schema:dotenv" not found. Ensure it is loaded before this plugin.');
  }

  await fastify.register(fastifyEnv, {
    confKey: 'secrets',  
    schema: schema,  
}, { name: 'application-config' });
});
// confKey: used to determine where the configuration values will be stored within the Fastify instance. The fastifyEnv plugin loads environment variables and stores them under fastify.secrets. 
 
// schema: used to validate the environment variables.
// fastify.getSchema is used to fetch a specific schema by its $id that has been registered with the Fastify instance
