/* eslint-disable no-unused-vars */
//  backend/shared-plugins/envPlugin.js
'use strict';

const fp = require('fastify-plugin');
const fastifyEnv = require('@fastify/env');

module.exports = fp(async function configLoader(fastify, opts) {
 
  const schema = fastify.getSchema('schema:dotenv');


  if (!schema) {
    throw new Error('Schema "schema:dotenv" not found. Ensure it is loaded before this plugin.');
  }

  await fastify.register(fastifyEnv, {
    confKey: 'secrets',  
    schema: schema,  
  }, { name: 'application-config' }); 

});