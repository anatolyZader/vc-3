'use strict';
/* eslint-disable no-unused-vars */
// authController.js

const fp = require('fastify-plugin');
const { v4: uuidv4 } = require('uuid');

async function authController(fastify, options) {

  let userService, authPersistAdapter, authInMemStorageAdapter;

  console.log('authController is loaded!');

  try {
    userService = await fastify.diContainer.resolve('userService');
    fastify.log.info('userService resolved at authController:', userService);
  } catch (error) {
    fastify.log.error('Error resolving userService:', error);
    throw new Error('Failed to resolve userService. Ensure it is registered in the DI container.');
  }

  try {
    authPersistAdapter = await fastify.diContainer.resolve('authPersistAdapter');
  } catch (error) {
    fastify.log.error('Error resolving authPersistAdapter at authController:', error);
  }

  try {
    authInMemStorageAdapter = await fastify.diContainer.resolve('authInMemStorageAdapter');
  } catch (error) {
    fastify.log.error('Error resolving authInMemStorageAdapter at authController:', error);
  }

  // ok
  fastify.decorate('discoverUsers', async function (request, reply) {
    try {
      const users = await userService.readUsers(authPersistAdapter);
      reply.send({ message: 'Users discovered!', users });
    } catch (error) {
      fastify.log.error('Error discovering users:', error);
      reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // ok
  fastify.decorate('registerUser', async function (request, reply) {
    const { username, email, password } = request.body;
    try {
      const newUser = await userService.register(username, email, password, authPersistAdapter);
      reply.send({ message: 'User registered successfully', user: newUser });
    } catch (error) {
      fastify.log.error('Error registering user:', error);
      reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // ok? returns token if user in db 
  fastify.decorate('loginUser', async function (request, reply) {
    const { email, password } = request.body;
    console.log('Login attempt with:', { email, password }); // Debug log
  
    if (!email || !password) {
      return reply.badRequest('Email and password are required');
    }
  
    try {
      const user = await userService.readUser(email, authPersistAdapter);
      if (!user || user.password !== password) {
        return reply.unauthorized('Invalid credentials');
      }
  
      const sessionId = uuidv4();
      await userService.storeSession(sessionId, user, authInMemStorageAdapter);
  
      const token = fastify.jwt.sign(
        { id: user.id, username: user.username },
        { jwtid: sessionId, expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
      );
  
      reply.send({ message: 'Authentication successful', token });
    } catch (error) {
      fastify.log.error('Error logging in user:', error);
      reply.code(500).send({ error: 'Internal Server Error' });
    }
  });
  

  fastify.decorate('logoutUser', async function (request, reply) {
    try {
      const sessionId = request.session.user.sessionId;
      await userService.deleteSession(sessionId, authInMemStorageAdapter);
      reply.code(204).send();
    } catch (error) {
      fastify.log.error('Error during logout:', error);
      reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('getMe', async function (request, reply) {
    try {
      const sessionId = request.session.user.sessionId;
      const user = await userService.getSession(sessionId, authInMemStorageAdapter);
      reply.send(user);
    } catch (error) {
      fastify.log.error('Error fetching user info:', error);
      reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('refreshToken', async function (request, reply) {
    try {
      const sessionId = request.session.user.sessionId;
      const user = await userService.getSession(sessionId, authInMemStorageAdapter);
      const token = fastify.jwt.sign(
        { id: user.id, username: user.username },
        { jwtid: sessionId, expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
      );

      reply.send({ token });
    } catch (error) {
      fastify.log.error('Error refreshing token:', error);
      reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('removeUser', async function (request, reply) {
    const { email, password } = request.body;
    try {
      const user = await userService.readUser(email, authPersistAdapter);
      if (!user || user.password !== password) { // Plain-text password check
        return reply.unauthorized('Invalid credentials');
      }
      await userService.removeUser(email, authPersistAdapter);
      reply.code(204).send();
    } catch (error) {
      fastify.log.error('Error removing user:', error);
      reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.addHook('onReady', async function () {
    console.log('hello authController/onReady');
  });
}

module.exports = fp(authController);
