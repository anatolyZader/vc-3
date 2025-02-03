/* eslint-disable no-unused-vars */
// authController.js
'use strict';

const fp = require('fastify-plugin');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

async function authController(fastify, options) {
  let userService;

  try {
    userService = await fastify.diContainer.resolve('userService');
  } catch (error) {
    fastify.log.error('Error resolving userService:', error); 
    throw fastify.httpErrors.internalServerError(
      'Failed to resolve userService. Ensure it is registered in the DI container.',
      { cause: error } 
    );
  }

  /**
   * GET /disco
   */
  fastify.decorate('readAllUsers', async function (request, reply) {
    try {
      const users = await userService.readAllUsers();
      return reply.send({ message: 'Users discovered!', users });
    } catch (error) {
      fastify.log.error('Error discovering users:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  /**
   * POST /register
   */
  fastify.decorate('registerUser', async function (request, reply) {
    const { username, email, password } = request.body;
    try {
      const newUser = await userService.registerUser(username, email, password);
      return reply.send({ message: 'User registered successfully', user: newUser });
    } catch (error) {
      fastify.log.error('Error registering user:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  /**
   * POST /remove
   */
  fastify.decorate('removeUser', async function (request, reply) {
    const { email } = request.body;
    try {
      const user = await userService.getUserInfo(email);
      if (!user) {
        return reply.unauthorized('Invalid credentials');
      }
      await userService.removeUser(email);
      return reply.code(204).send();
    } catch (error) {
      fastify.log.error('Error removing user:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  /**
   * POST /login
   */
  fastify.decorate('loginUser', async function (request, reply) {
    const jti = uuidv4();
    const { email, password } = request.body;
    console.log('Login attempt with:', { email, password });
    if (!email || !password) {
      return reply.badRequest('Email and password are required');
    }

    try {
      const user = await userService.getUserInfo(email);
      if (!user || !(await bcrypt.compare(password, user.password))) { // *** special comment
        return reply.unauthorized('Invalid credentials');
      }

      const token = fastify.jwt.sign(
        { id: user.id, username: user.username, jti: jti }, 
        { jwtid: jti, expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
      );

      return reply.send({ message: 'Authentication successful', token });
    } catch (error) {
      fastify.log.error('Error logging in user:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  /**
   * POST /logout
   */
  fastify.decorate('logoutUser', async function (request, reply) {
    try {
      request.revokeToken();
      return reply.code(204).send();
    } catch (error) {
      fastify.log.error('Error during logout:', error); 
      return reply.internalServerError(error.message || 'Internal Server Error', { cause: error }); 
    }
  });

  /**
   * GET /me
   */
  fastify.decorate('getUserInfo', async function (request, reply) {
    try {
      // using verifyToken -  request.user is set by jwtVerify()
      const user = request.user || {};
      return reply.send(user);
    } catch (error) {
      fastify.log.error('Error fetching user info:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  /**
   * POST /refresh
   */
  fastify.decorate('refreshToken', async function (request, reply) {
    try {
      const user = request.user || {};
      const newToken = fastify.jwt.sign(
        { id: user.id, username: user.username },
        {
          expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h',
        }
      );
      return reply.send({ token: newToken });
    } catch (error) {
      fastify.log.error('Error refreshing token:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  fastify.decorate('googleCallback', async function (request, reply) {
    try {
      // Check request query for debugging
      console.log('>>> /auth/google/callback called with query:', request.query);
  
      // 1) Exchange the authorization code for access_token & id_token
      const token = await this.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
      console.log('>>> Received token from Google:', token); // Contains { access_token, refresh_token, id_token, ... }
  
      const { id_token } = token.token;
      if (!id_token) {
        console.log('>>> No id_token found in token response');
        return reply.internalServerError('Missing ID token from Google OAuth');
      }
  
      // 2) Verify the ID token payload using google-auth-library
      const payload = await fastify.verifyGoogleIdToken(id_token);
      console.log('>>> ID token payload:', payload); 
      // Example: { email, email_verified, name, picture, sub, ... }
  
      if (!payload || !payload.email_verified) {
        console.log('>>> Email not verified or payload missing');
        return reply.unauthorized('Google account not verified.');
      }
  
      // 3) Check if user already exists in your DB; if not, create a new user
      const userEmail = payload.email;
      console.log('>>> Looking up user with email:', userEmail);
  
      let user = await fastify.userService.getUserInfo(userEmail, fastify.authPersistAdapter);
      console.log('>>> User lookup result:', user);
  
      if (!user) {
        console.log('>>> User not found, registering new user');
        const username = payload.name || payload.email.split('@')[0];
        user = await fastify.userService.registerUser(
          username,
          userEmail,
          'some-random-placeholder-password', // or null, up to your approach
          fastify.authPersistAdapter
        );
        console.log('>>> New user registered:', user);
      }
  
      // 4) Generate a local JWT for your app
      const jti = require('uuid').v4();
      const localToken = fastify.jwt.sign(
        { id: user.id, username: user.username, jti },
        { jwtid: jti, expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
      );
      console.log('>>> Generated local JWT (shortened for log):', localToken.slice(0, 40) + '...');
  
      // 5) Return or redirect with your local token
      //    For demonstration, we’ll just send JSON:
      return reply.send({
        message: 'Google OAuth successful',
        token: localToken,
        user: {
          email: user.email,
          username: user.username,
          id: user.id
        }
      });
  
    } catch (err) {
      console.error('>>> Google OAuth callback error:', err);
      return reply.internalServerError('Google OAuth failed', { cause: err });
    }
  });
  
}

module.exports = fp(authController);
