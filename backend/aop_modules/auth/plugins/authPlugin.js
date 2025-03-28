// authPlugin.js
/* eslint-disable no-unused-vars */

'use strict'

const fs = require('fs');
const path = require('path');
const fp = require('fastify-plugin');
const fastifyJwt = require('@fastify/jwt');
const fastifyOAuth2 = require('@fastify/oauth2');
const { OAuth2Client } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid');

// eslint-disable-next-line no-unused-vars
module.exports = fp(async function authPlugin (fastify, opts) {

  console.log('=== authPlugin loaded! ===');

  // ----------------------------
  // JWT
  // ----------------------------
  const revokedTokens = new Map();

  fastify.register(fastifyJwt, {
    secret: fastify.secrets.JWT_SECRET,
    sign: {
      expiresIn: fastify.secrets.JWT_EXPIRE_IN
    },
    verify: {
      requestProperty: 'user',
    },
    trusted: function isTrusted (request, decodedToken) {
      return !revokedTokens.has(decodedToken.jti);
    }
  });

  fastify.decorate('verifyToken', async function (request, reply) {
    // Try to get token from cookies
    let token = request.cookies && request.cookies.authToken;

    // If not found in cookies, check the Authorization header
    if (!token && request.headers.authorization) {
      const parts = request.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      // Throwing stops the request immediately
      throw fastify.httpErrors.unauthorized('Missing token');
    }

    try {
      const decoded = await fastify.jwt.verify(token); // Validate the JWT
      request.user = decoded; // Attach decoded payload to request.user
    } catch (err) {
      fastify.log.error('Token verification error:', err);
      throw fastify.httpErrors.unauthorized(err.message);
    }
  });

  fastify.decorateRequest('revokeToken', function () {
    console.log('>>> revokeToken called');
    console.log('this.user before revoke:', this.user);

    if (!this.user || !this.user.jti) {
      throw this.httpErrors.unauthorized('Missing jti in token');
    }
    revokedTokens.set(this.user.jti, true);
    console.log('Revoked token with jti:', this.user.jti);
  });

  fastify.decorateRequest('generateToken', async function () {
    console.log('>>> generateToken called');
    const token = await fastify.jwt.sign({
      id: String(this.user.id),
      username: this.user.username
    }, {
      jwtid: uuidv4(),
      expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h'
    });

    return token;
  });

  // ----------------------------
  // OAuth2 (Google)
  // ----------------------------
  let googleCreds = null;
  console.log('fastify.secrets.GOOGLE_APPLICATION_CREDENTIALS at authPlugin.js:', fastify.secrets.GOOGLE_APPLICATION_CREDENTIALS);
  if (fastify.secrets.GOOGLE_APPLICATION_CREDENTIALS) {
    const fullPath = path.resolve(fastify.secrets.GOOGLE_APPLICATION_CREDENTIALS);
    console.log('Reading Google credentials from:', fullPath);
    try {
      googleCreds = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      console.log('googleCreds loaded successfully');
    } catch (error) {
      console.error('Error reading or parsing Google credentials:', error);
    }
  } else {
    console.warn('No GOOGLE_APPLICATION_CREDENTIALS path found in fastify.secrets.');
  }

  // Ensure googleCreds is valid before accessing .web
  if (!googleCreds || !googleCreds.web) {
    console.error('googleCreds or googleCreds.web is missing. Check your credentials file.');
    return;
  }

  const clientId = googleCreds.web.client_id;
  const clientSecret = googleCreds.web.client_secret;

  console.log('clientId:', clientId);
  console.log('clientSecret:', clientSecret ? '*** [HIDDEN IN PRODUCTION LOGS] ***' : 'Not provided');
  console.log('fastify.secrets.APP_URL at authPlugin:', fastify.secrets.APP_URL);

  fastify.register(fastifyOAuth2, {
    name: 'googleOAuth2',
    scope: ['profile', 'email'],
    cookie: {
      secure: true,
      sameSite: 'none',
    },
    credentials: {
      client: {
        id: clientId,
        secret: clientSecret,
      },
      auth: fastifyOAuth2.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: '/auth/google',
    callbackUri: `${fastify.secrets.APP_URL}/auth/google/callback`
  });

  const googleClient = new OAuth2Client(clientId);
  fastify.decorate('verifyGoogleIdToken', async function (idToken) {
    console.log('>>> verifyGoogleIdToken called with idToken:', idToken);
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: clientId
    });
    const payload = ticket.getPayload();
    console.log('verifyGoogleIdToken payload:', payload);
    return payload; // includes email, name, picture, etc.
  });

});
