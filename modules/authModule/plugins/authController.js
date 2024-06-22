/* eslint-disable no-unused-vars */
const fp = require('fastify-plugin');

let authService

async function authController(fastify, options) {


  fastify.decorate('holaAuth', async function (request, reply) {

      console.log('hello holaAuth handler!');
  });

}

module.exports = fp(authController);
