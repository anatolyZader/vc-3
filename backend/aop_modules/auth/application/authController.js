// authController.js
/* eslint-disable no-unused-vars */
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

  // Helper to set auth cookies uniformly
  const setAuthCookies = (reply, token) => {
    reply.setCookie('authToken', token, {
      path: '/',
      httpOnly: true,
      secure: true, // adjust to false in local dev if needed
      sameSite: 'Strict', // or 'Lax' based on your requirements
      maxAge: 60 * 60 * 24, // 1 day
    });
  };

  fastify.decorate('googleLoginUser', async function (request, reply) {
    try {
      const { token: googleToken } = request.body;
      if (!googleToken) {
        return reply.badRequest('Missing Google access token');
      }

      // Verify Google token and resolve user via userService
      const googleUser = await userService.loginWithGoogle(googleToken);
      if (!googleUser) {
        return reply.unauthorized('Google login failed: could not verify user.');
      }

      const jti = uuidv4();
      const localToken = fastify.jwt.sign(
        { id: googleUser.id, username: googleUser.username, jti },
        { jwtid: jti, expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
      );

      // Set the auth cookie
      setAuthCookies(reply, localToken);

      return reply.send({
        message: 'Google login successful',
        user: {
          id: googleUser.id,
          email: googleUser.email,
          username: googleUser.username,
          picture: googleUser.picture || null,
        },
      });
    } catch (error) {
      fastify.log.error('Error in googleLoginUser:', error);
      return reply.internalServerError('Failed to process Google login', { cause: error });
    }
  });

  fastify.decorate('readAllUsers', async function (request, reply) {
    try {
      const users = await userService.readAllUsers();
      return reply.send({ message: 'Users discovered!', users });
    } catch (error) {
      fastify.log.error('Error discovering users:', error);
      return reply.internalServerError('Internal Server Error', { cause: error });
    }
  });

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

  fastify.decorate('loginUser', async function (request, reply) {
    const jti = uuidv4();
    const { email, password } = request.body;
    if (!email || !password) {
      return reply.badRequest('Email and password are required');
    }
  
    try {
      const user = await userService.getUserInfo(email);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return reply.unauthorized('Invalid credentials');
      }
  
      const localToken = fastify.jwt.sign(
        { id: user.id, username: user.username, jti },
        { jwtid: jti, expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
      );
  
      // Set auth cookie for manual login
      reply.setCookie('authToken', localToken, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: 60 * 60 * 24,
      });
  
      return reply.send({
        message: 'Authentication successful',
        user: { id: user.id, email: user.email, username: user.username },
      });
    } catch (error) {
      fastify.log.error('Error logging in user:', error);
      return reply.internalServerError('Internal Server Error', { cause: error });
    }
  });
  

  fastify.decorate('logoutUser', async function (request, reply) {
    reply.clearCookie('authToken', { path: '/' });
    return reply.code(204).send();
  });

  fastify.decorate('getUserInfo', async function (request, reply) {
    if (!request.user || !request.user.username) {
      throw fastify.httpErrors.unauthorized('User not authenticated');
    }
    return reply.send(request.user);
  });

  fastify.decorate('refreshToken', async function (request, reply) {
    try {
      const user = request.user || {};
      const localToken = fastify.jwt.sign(
        { id: user.id, username: user.username },
        { expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
      );
      reply.setCookie('authToken', localToken, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: 60 * 60 * 24,
      });
      return reply.send({ token: localToken });
    } catch (error) {
      fastify.log.error('Error refreshing token:', error);
      return reply.internalServerError('Internal Server Error', { cause: error });
    }
  });
  
  fastify.decorate('googleCallback', async function (request, reply) {
    try {
      console.log('>>> /auth/google/callback called with query:', request.query);
  
      // Exchange the authorization code for tokens using fastify-oauth2
      const tokenResponse = await this.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
      const { id_token: googleCallbackToken } = tokenResponse.token;
      if (!googleCallbackToken) {
        return reply.internalServerError('Missing ID token from Google OAuth');
      }
  
      const payload = await fastify.verifyGoogleIdToken(googleCallbackToken);
      if (!payload || !payload.email_verified) {
        return reply.unauthorized('Google account not verified.');
      }
  
      const userEmail = payload.email;
      let user = await userService.getUserInfo(userEmail, fastify.authPersistAdapter);
      if (!user) {
        const username = payload.name || payload.email.split('@')[0];
        user = await userService.registerUser(username, userEmail, 'some-random-placeholder-password', fastify.authPersistAdapter);
      }
  
      const jti = uuidv4();
      const localToken = fastify.jwt.sign(
        { id: user.id, username: user.username, jti },
        { jwtid: jti, expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
      );
  
      // Set auth cookie and redirect to frontend dashboard
      setAuthCookies(reply, localToken);
      return reply.redirect(`${fastify.secrets.APP_URL}/dashboard`);
    } catch (err) {
      console.error('>>> Google OAuth callback error:', err);
      return reply.internalServerError('Google OAuth failed', { cause: err });
    }
  });
  
}

module.exports = fp(authController);
