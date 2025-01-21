'use strict';
/* eslint-disable no-unused-vars */
// authController.js

const fp = require('fastify-plugin');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

async function authController(fastify, options) {
  let userService, authPersistAdapter;

  try {
    userService = await fastify.diContainer.resolve('userService');
  } catch (error) {
    fastify.log.error('Error resolving userService:', error); 
    throw fastify.httpErrors.internalServerError(
      'Failed to resolve userService. Ensure it is registered in the DI container.',
      { cause: error } 
    );
  }

  try {
    authPersistAdapter = await fastify.diContainer.resolve('authPersistAdapter');
  } catch (error) {
    fastify.log.error('Error resolving authPersistAdapter at authController:', error); 
    throw fastify.httpErrors.internalServerError(
      'Failed to resolve authPersistAdapter at authController',
      { cause: error } 
    );
  }

  /**
   * GET /disco
   */
  fastify.decorate('readAllUsers', async function (request, reply) {
    try {
      const users = await userService.readAllUsers(authPersistAdapter);
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
      const newUser = await userService.registerUser(username, email, password, authPersistAdapter);
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
      const user = await userService.getUserInfo(email, authPersistAdapter);
      if (!user) {
        return reply.unauthorized('Invalid credentials');
      }
      await userService.removeUser(email, authPersistAdapter);
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
      const user = await userService.getUserInfo(email, authPersistAdapter);
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
}

module.exports = fp(authController);
