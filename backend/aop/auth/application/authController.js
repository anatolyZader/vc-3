'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

let userService;

async function authController(fastify, options) {
  fastify.decorate('discoverUsers', async function (request, reply) {
    try {
      const users = await userService.readUsers();
      console.log('users at authController.discoverUsers: ', users)
      reply.send({ message: 'Users discovered!', users });
    } catch (error) {
      fastify.log.error('Error discovering users:', error);
      reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('registerUser', async function (request, reply) {
    const { username, email, password } = request.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await userService.register(username, email, hashedPassword);
      reply.send({ message: 'User registered successfully', user: newUser });
    } catch (error) {
      fastify.log.error('Error registering user:', error);
      reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('loginUser', async function (request, reply) {
    const { email, password } = request.body;
    try {
      const user = await userService.readUser(email);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return reply.unauthorized('Invalid credentials');
      }
      const sessionId = uuidv4();
      await userService.storeSession(sessionId, user);

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
      await userService.deleteSession(sessionId);
      reply.code(204).send();
    } catch (error) {
      fastify.log.error('Error during logout:', error);
      reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('getMe', async function (request, reply) {
    try {
      const user = await userService.getSession(request.session.user.sessionId);
      reply.send(user);
    } catch (error) {
      fastify.log.error('Error fetching user info:', error);
      reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('refreshToken', async function (request, reply) {
    try {
      const sessionId = request.session.user.sessionId;
      const user = await userService.getSession(sessionId);

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
    const { email } = request.body;
    try {
      await userService.removeUser(email);
      reply.code(204).send();
    } catch (error) {
      fastify.log.error('Error removing user:', error);
      reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.addHook('onReady', async function () {
    try {
      userService = fastify.diContainer.resolve('userService');
      fastify.log.info('UserService resolved successfully.');
    } catch (error) {
      fastify.log.error('Error resolving UserService:', error);
      throw new Error('Failed to resolve UserService. Ensure it is registered in the DI container.');
    }
  });
}

module.exports = fp(authController);
