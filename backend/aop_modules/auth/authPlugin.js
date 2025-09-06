// authPlugin.js
'use strict';

const fp = require('fastify-plugin');
const fs = require('fs');
const fastifyJwt = require('@fastify/jwt');
const fastifyOAuth2 = require('@fastify/oauth2');
const { OAuth2Client } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid');

// Export the plugin function WITH fastify-plugin wrapper to make decorators globally available
module.exports = fp(async function authPlugin(fastify, opts) {
  const BUILDING_API_SPEC = process.env.GENERATING_HTTP_API_SPEC === '1';

  // ────────────────────────────────────────────────────────────────
  // GOOGLE OAUTH + JWT CREDENTIALS SETUP
  // ────────────────────────────────────────────────────────────────
  let credentialsJsonString, clientId, clientSecret;

  if (
    process.env.USER_OAUTH2_CREDENTIALS &&
    process.env.USER_OAUTH2_CREDENTIALS.startsWith('{') // if it looks like a JSON string
  ) {
    credentialsJsonString = JSON.parse(process.env.USER_OAUTH2_CREDENTIALS);
  } else if (fastify.secrets && typeof fastify.secrets.USER_OAUTH2_CREDENTIALS === 'string') {
    const credentialsPath = fastify.secrets.USER_OAUTH2_CREDENTIALS;
    credentialsJsonString = JSON.parse(
      await fs.promises.readFile(credentialsPath, { encoding: 'utf8' })
    );
  } else {
    clientId = process.env.FALLBACK_CLIENT_ID;
    clientSecret = process.env.FALLBACK_CLIENT_SECRET;
  }

  if (credentialsJsonString) {
    clientId = credentialsJsonString.web.client_id;
    clientSecret = credentialsJsonString.web.client_secret;
  }

  const revokedTokens = new Map();

  // ────────────────────────────────────────────────────────────────
  // JWT SETUP
  // ────────────────────────────────────────────────────────────────
  if (!BUILDING_API_SPEC) {
    await fastify.register(fastifyJwt, {
      secret: fastify.secrets.JWT_SECRET,
      sign: { expiresIn: fastify.secrets.JWT_EXPIRE_IN },
      verify: { requestProperty: 'user' },
      trusted(request, decoded) {
        return !revokedTokens.has(decoded.jti);
      },
    });
  }

  // ────────────────────────────────────────────────────────────────
  // JWT DECORATORS
  // ────────────────────────────────────────────────────────────────
  if (!BUILDING_API_SPEC) {
    fastify.decorate('verifyToken', async function (request) {
      let token = request.cookies?.authToken;
      if (!token && request.headers.authorization) {
        const [scheme, value] = request.headers.authorization.split(' ');
        if (scheme === 'Bearer') token = value;
      }
      if (!token) throw fastify.httpErrors.unauthorized('Missing token');
      
      try {
        request.user = await fastify.jwt.verify(token);
      } catch (error) {
        // Handle JWT verification errors properly
        if (error.code === 'FAST_JWT_EXPIRED') {
          throw fastify.httpErrors.unauthorized('Token has expired');
        } else if (error.code === 'FAST_JWT_INVALID_TOKEN') {
          throw fastify.httpErrors.unauthorized('Invalid token');
        } else if (error.code === 'FAST_JWT_MALFORMED_TOKEN') {
          throw fastify.httpErrors.unauthorized('Malformed token');
        } else {
          // For any other JWT-related error, return unauthorized
          throw fastify.httpErrors.unauthorized('Token verification failed');
        }
      }
    });

    fastify.decorateRequest('revokeToken', function () {
      if (!this.user?.jti) throw this.httpErrors.unauthorized('Missing jti');
      revokedTokens.set(this.user.jti, true);
    });

    fastify.decorateRequest('generateToken', async function () {
      return fastify.jwt.sign(
        { id: String(this.user.id), username: this.user.username },
        { jwtid: uuidv4(), expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
      );
    });
  } else {
    // Provide no-op versions for spec generation
    fastify.decorate('verifyToken', async function (request) {
      // No-op for spec generation
      request.user = { id: 'spec-user', username: 'spec-user' };
    });

    fastify.decorateRequest('revokeToken', function () {
      // No-op for spec generation
    });

    fastify.decorateRequest('generateToken', async function () {
      // No-op for spec generation
      return 'spec-token';
    });
  }

  // ────────────────────────────────────────────────────────────────
  // OAUTH2 SETUP
  // ────────────────────────────────────────────────────────────────
  const cookieSecure   = process.env.NODE_ENV === 'staging';
  const cookieSameSite = cookieSecure ? 'None' : 'Lax';
  const googleCallbackUri =
    cookieSecure
      ? 'https://eventstorm.me/api/auth/google/callback'
      : 'http://localhost:3000/api/auth/google/callback';

  if (!BUILDING_API_SPEC) {
    await fastify.register(
      fastifyOAuth2,
      {
        name: 'googleOAuth2',
        scope: ['profile', 'email', 'openid'],
        cookie: { secure: cookieSecure, sameSite: cookieSameSite, httpOnly: true },
        credentials: {
          client: { id: clientId, secret: clientSecret },
          auth: fastifyOAuth2.GOOGLE_CONFIGURATION,
        },
        startRedirectPath: '/api/auth/google',
        callbackUri: googleCallbackUri,
      },
      { encapsulate: false }
    );
  }

  // ────────────────────────────────────────────────────────────────
  // GOOGLE CLIENT SETUP
  // ────────────────────────────────────────────────────────────────
  if (!BUILDING_API_SPEC) {
    const googleClient = new OAuth2Client(clientId);
    fastify.decorate('verifyGoogleIdToken', async (idToken) => {
      const ticket = await googleClient.verifyIdToken({ idToken, audience: clientId });
      return ticket.getPayload();
    });
  } else {
    // Provide no-op version for spec generation
    fastify.decorate('verifyGoogleIdToken', async (idToken) => {
      return { sub: 'spec-user', email: 'spec@example.com', name: 'Spec User' };
    });
  }

  // ────────────────────────────────────────────────────────────────
  // GOOGLE OAUTH CALLBACK ROUTE
  // ────────────────────────────────────────────────────────────────
  fastify.get('/api/auth/google/callback', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          state: { type: 'string' }
        },
        additionalProperties: true
      },
      response: {
        302: {
          description: 'Redirect to frontend after successful authentication'
        }
      }
    }
  }, async (req, reply) => {
    const token            = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
    const googleAccessToken = token.token.access_token;

    const userService = await req.diScope.resolve('userService');
    const googleUser  = await userService.loginWithGoogle(googleAccessToken);
    if (!googleUser) return reply.unauthorized('Google profile invalid');

    const jti  = uuidv4();
    const jwt  = fastify.jwt.sign(
      { id: googleUser.id, username: googleUser.username, jti },
      { jwtid: jti, expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
    );

    fastify.log.info(`DEV: JWT token for user ${googleUser.id}: ${jwt}`);

    reply.setCookie('authToken', jwt, {
      path: '/',
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
    });

    reply.redirect((cookieSecure ? 'https://eventstorm.me' : 'http://localhost:5173') + '/chat');
  });
});
