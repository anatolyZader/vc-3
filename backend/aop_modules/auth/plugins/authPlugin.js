// authPlugin.js
/* eslint-disable no-unused-vars */
// 'use strict';

// const fs = require('fs');
// const path = require('path');
// const fp = require('fastify-plugin');
// const fastifyJwt = require('@fastify/jwt');
// const { OAuth2Client } = require('google-auth-library');
// const { v4: uuidv4 } = require('uuid');

// module.exports = fp(async function authPlugin(fastify, opts) {
//   console.log('=== authPlugin loaded! ===');


//   // ----------------------------
//   // JWT configuration
//   // ----------------------------
//   const revokedTokens = new Map();

//   fastify.register(fastifyJwt, {
//     secret: fastify.secrets.JWT_SECRET,
//     sign: { expiresIn: fastify.secrets.JWT_EXPIRE_IN },
//     verify: { requestProperty: 'user' },
//     trusted: function isTrusted(request, decodedToken) {
//       return !revokedTokens.has(decodedToken.jti);
//     },
//   });

//   fastify.decorate('verifyToken', async function (request, reply) {
//     let authToken = request.cookies && request.cookies.authToken;
//     if (!authToken && request.headers.authorization) {
//       const parts = request.headers.authorization.split(' ');
//       if (parts.length === 2 && parts[0] === 'Bearer') {
//         authToken = parts[1];
//       }
//     }
//     if (!authToken) {
//       throw fastify.httpErrors.unauthorized('Missing token');
//     }
//     try {
//       const decoded = await fastify.jwt.verify(authToken);
//       request.user = decoded;
//     } catch (err) {
//       fastify.log.error('Token verification error:', err);
//       throw fastify.httpErrors.unauthorized(err.message);
//     }
//   });

//   fastify.decorateRequest('revokeToken', function () {
//     if (!this.user || !this.user.jti) {
//       throw this.httpErrors.unauthorized('Missing jti in token');
//     }
//     revokedTokens.set(this.user.jti, true);
//   });

//   fastify.decorateRequest('generateToken', async function () {
//     const authToken = await fastify.jwt.sign(
//       { id: String(this.user.id), username: this.user.username },
//       {
//         jwtid: uuidv4(),
//         expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h',
//       }
//     );
//     return authToken;
//   });


// });
