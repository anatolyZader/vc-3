// authPlugin.js
/* eslint-disable no-unused-vars */
'use strict';

const fs = require('fs');
const path = require('path');
const fp = require('fastify-plugin');
const fastifyJwt = require('@fastify/jwt');
const fastifyOAuth2 = require('@fastify/oauth2');
const { OAuth2Client } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid');

module.exports = fp(async function authPlugin(fastify, opts) {
  console.log('=== authPlugin loaded! ===');

  // ----------------------------
  // JWT configuration
  // ----------------------------
  const revokedTokens = new Map();

  fastify.register(fastifyJwt, {
    secret: fastify.secrets.JWT_SECRET,
    sign: { expiresIn: fastify.secrets.JWT_EXPIRE_IN },
    verify: { requestProperty: 'user' },
    trusted: function isTrusted(request, decodedToken) {
      return !revokedTokens.has(decodedToken.jti);
    },
  });

  fastify.decorate('verifyToken', async function (request, reply) {
    let localToken = request.cookies && request.cookies.authToken;
    if (!localToken && request.headers.authorization) {
      const parts = request.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        localToken = parts[1];
      }
    }
    if (!localToken) {
      throw fastify.httpErrors.unauthorized('Missing token');
    }
    try {
      const decoded = await fastify.jwt.verify(localToken);
      request.user = decoded;
    } catch (err) {
      fastify.log.error('Token verification error:', err);
      throw fastify.httpErrors.unauthorized(err.message);
    }
  });

  fastify.decorateRequest('revokeToken', function () {
    if (!this.user || !this.user.jti) {
      throw this.httpErrors.unauthorized('Missing jti in token');
    }
    revokedTokens.set(this.user.jti, true);
  });

  fastify.decorateRequest('generateToken', async function () {
    const localToken = await fastify.jwt.sign(
      { id: String(this.user.id), username: this.user.username },
      {
        jwtid: uuidv4(),
        expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h',
      }
    );
    return localToken;
  });

  // ----------------------------
  // OAuth2 (Google) configuration
  // ----------------------------
  let googleCreds = null;

  if (fastify.secrets.GOOGLE_APPLICATION_CREDENTIALS) {
    const fullPath = path.resolve(fastify.secrets.GOOGLE_APPLICATION_CREDENTIALS);
    try {
      googleCreds = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (error) {
      console.error('Error reading Google credentials:', error);
    }
  } else {
    console.warn('No GOOGLE_APPLICATION_CREDENTIALS path found in fastify.secrets.');
  }
  if (!googleCreds || !googleCreds.web) {
    console.error('googleCreds or googleCreds.web is missing.');
    return;
  }

  const clientId = googleCreds.web.client_id;
  const clientSecret = googleCreds.web.client_secret;
  console.log('googleCreds:', googleCreds);

  fastify.register(fastifyOAuth2, {
    name: 'googleOAuth2',
    scope: ['profile', 'email', 'openid'], // After the user authenticates, you can inspect the token response (or decoded ID token payload) to ensure that the scopes you requested were granted.
    cookie: { 
      // TODO - set secure to true when using HTTPS !!!!!!
      secure: false,
      sameSite: 'none' },
    credentials: {
      client: { id: clientId, secret: clientSecret },
      auth: fastifyOAuth2.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: '/auth/google',
    callbackUri: 'http://localhost:3000/auth/google/callback',
  });  // When a “Sign in with Google” at LoginPage is clicked, your AuthContext calls the useGoogleLogin hook. This hook uses a popup-based flow (configured with flow: 'auth-code'), which opens a separate window for Google authentication. Once the user completes authentication in the popup, the hook returns an authorization code that your client then sends to a backend endpoint (e.g., /auth/google-login).

  const googleClient = new OAuth2Client(clientId);
  fastify.decorate('verifyGoogleIdToken', async function (googleIdToken) {
    console.lohg('Verifying Google ID token:', googleIdToken);
    if (!googleIdToken) {
      throw new Error('Google ID token is required');
    }
    const ticket = await googleClient.verifyIdToken({
      idToken: googleIdToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    return payload;
  });
});
