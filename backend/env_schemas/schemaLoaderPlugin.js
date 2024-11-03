// schemaLoaderPlugin.js

'use strict'

const fp = require('fastify-plugin')
const env = require('@fastify/env')

module.exports = fp(async function schemaLoaderPlugin (fastify, opts) { 
  const schema = require('./dotenv.json')

  await fastify.register(env, {
    schema: schema,
    dotenv: true 
  })

  await fastify.addSchema(schema);


  console.log("Schema as imported from dotenv.json to schemaLoaderPlugin.js :", schema); 
 
 
})