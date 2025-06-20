// corsPlugin.js
/* eslint-disable no-unused-vars */
'use strict'

const fp = require('fastify-plugin')
const fastifyCors = require('@fastify/cors')

module.exports = fp(async function corsPlugin (fastify, opts) {
  fastify.register(fastifyCors, {
    origin: [
      'http://localhost:5173',
      'https://eventstorm.me',
      'http://localhost:3000',  
      'http://127.0.0.1:3000'  
    ],
    credentials: true
  })
})