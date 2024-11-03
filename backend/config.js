'use strict';

const fp = require('fastify-plugin');
const fastifyEnv = require('@fastify/env');

module.exports = fp(async function configLoader(fastify, opts) {
  console.log("Available schemas at config.js:", fastify.getSchemas());  
  const schema = fastify.getSchema('schema:dotenv');
  console.log("Retrieved schema at config.js:", schema); 

  if (!schema) {
    throw new Error('Schema "schema:dotenv" not found. Ensure it is loaded before this plugin.');
  }

  await fastify.register(fastifyEnv, {
    confKey: 'secrets',  
    schema: schema,  
  }, { name: 'application-config' }); 

  console.log("fastify.secrets:", fastify.secrets); 
});
