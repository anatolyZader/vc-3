/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');
const { v4: uuidv4 } = require('uuid');

let userService, authPostgresAdapter, authRedisAdapter;

async function authController(fastify, options) {
  fastify.decorate('discoverUsers', async function (request, reply) {
    try {
      const users = await userService.readUsers(authPostgresAdapter);
      reply.send({ message: 'Users discovered!', users });
    } catch (error) {
      fastify.log.error('Error discovering users:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('registerUser', async function (request, reply) {
    const { username, email, password } = request.body;
    try {
      const newUser = await userService.register(username, email, password, authPostgresAdapter, authRedisAdapter);
      reply.send({ message: 'User registered successfully', user: newUser });
    } catch (error) {
      fastify.log.error('Error registering user:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('loginUser', async function (request, reply) {
    const { email, password } = request.body;
    try {
      const user = await userService.readUser(email, authPostgresAdapter);

      if (!user || user.password !== password) {
        reply.status(401).send({ error: 'Invalid credentials' });
        return;
      }

      // Store user in Redis session
      const sessionId = uuidv4();
      await authRedisAdapter.storeSession(sessionId, user);

      // Generate JWT token
      const token = fastify.jwt.sign({ id: user.id, username: user.username }, {
        jwtid: sessionId,
        expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h',
      });

      reply.send({ message: 'Authentication successful', token });
    } catch (error) {
      fastify.log.error('Error logging in user:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('logoutUser', async function (request, reply) {
    try {
      const sessionId = request.session.user.sessionId;
      await authRedisAdapter.deleteSession(sessionId);
      reply.code(204).send();
    } catch (error) {
      fastify.log.error('Error during logout:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('getMe', async function (request, reply) {
    try {
      const user = await authRedisAdapter.getSession(request.session.user.sessionId);
      reply.send(user);
    } catch (error) {
      fastify.log.error('Error fetching user info:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('refreshToken', async function (request, reply) {
    try {
      const sessionId = request.session.user.sessionId;
      const user = await authRedisAdapter.getSession(sessionId);

      const token = fastify.jwt.sign({ id: user.id, username: user.username }, {
        jwtid: sessionId,
        expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h',
      });

      reply.send({ token });
    } catch (error) {
      fastify.log.error('Error refreshing token:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.addHook('onReady', async function () {
    userService = fastify.diContainer.resolve('userService');
    authPostgresAdapter = fastify.diContainer.resolve('authPostgresAdapter');
    authRedisAdapter = fastify.diContainer.resolve('authRedisAdapter');
  });
}

module.exports = fp(authController);
