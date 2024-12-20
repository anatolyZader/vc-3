'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function authController(fastify, options) {

  let userService, authPersistAdapter, authInMemStorageAdapter;

  console.log('authController is loaded!');


  // --- Original DI resolution code removed from here and re-implemented in onReady. ---
  // try {
  //   authPersistAdapter = await fastify.diContainer.resolve('authPersistAdapter');
  //   console.log('authPersistAdapter at authController:', authPersistAdapter);
  // } catch (error) {
  //   fastify.log.error('Error resolving authPersistAdapter at authController:', error);
  // }

  // try {
  //   authInMemStorageAdapter = await fastify.diContainer.resolve('authInMemStorageAdapter');
  //   console.log('authInMemStorageAdapter at authController:', authInMemStorageAdapter);
  // } catch (error) {
  //   fastify.log.error('Error resolving authInMemStorageAdapter at authController:', error);
  // }

  // try {
  //   const userServiceRegistered = await fastify.diContainer.has('userService');
  //   if (!userServiceRegistered) {
  //     fastify.log.error('UserService is not registered in the DI container');
  //     throw new Error('UserService is not registered');
  //   }
  //   userService = await fastify.diContainer.resolve('userService');
  //   fastify.log.info('userService resolved successfully:', userService);
  // } catch (error) {
  //   fastify.log.error('Error resolving userService:', error);
  //   throw new Error('Failed to resolve userService. Ensure it is registered in the DI container.');
  // }

  console.log('authController is loaded');
  console.log('authPersistAdapter at authController.js: ', authPersistAdapter);
  console.log('authInMemStorageAdapter at authController.js: ', authInMemStorageAdapter);

  fastify.decorate('discoverUsers', async function (request, reply) {
    try {
      const users = await userService.readUsers(authPersistAdapter);
      console.log('users at authController.discoverUsers: ', users);
      reply.send({ message: 'Users discovered!', users });
    } catch (error) {
      fastify.log.error('Error discovering users:', error);
      reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('registerUser', async function (request, reply) {
    const { username, email, password } = request.body;
    try {
      // const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await userService.register(username, email, password, authPersistAdapter);
      reply.send({ message: 'User registered successfully', user: newUser });
    } catch (error) {
      fastify.log.error('Error registering user:', error);
      reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('loginUser', async function (request, reply) {
    const { email, password } = request.body;
    try {
      const user = await userService.readUser(email, authPersistAdapter);
      if (!user || !(await bcrypt.compare(password, user.password))) {
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
      await userService.removeUser(email, password, authPersistAdapter);
      reply.code(204).send();
    } catch (error) {
      fastify.log.error('Error removing user:', error);
      reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.addHook('onReady', async function () {
    console.log('hello authController/onReady');

    try {
      const diRegistrations = await fastify.diContainer.registrations;
      console.log('diRegistrations at authController: ', diRegistrations);
    } catch {
      console.log('di registrations authController are unavailable');
    }

    try {
      authPersistAdapter = await fastify.diContainer.resolve('authPersistAdapter');
      console.log('authPersistAdapter at authController:', authPersistAdapter);
    } catch (error) {
      fastify.log.error('Error resolving authPersistAdapter at authController:', error);
    }

    try {
      authInMemStorageAdapter = await fastify.diContainer.resolve('authInMemStorageAdapter');
      console.log('authInMemStorageAdapter at authController:', authInMemStorageAdapter);
    } catch (error) {
      fastify.log.error('Error resolving authInMemStorageAdapter at authController:', error);
    }

    try {
      const userService = await fastify.diContainer.resolve('userService');
      fastify.log.info('userService resolved successfully:', userService);
    } catch (error) {
      fastify.log.error('Error resolving userService:', error);
      throw new Error('Failed to resolve userService. Ensure it is registered in the DI container.');
    }

    console.log('authController is loaded');
    console.log('authPersistAdapter at authController.js: ', authPersistAdapter);
    console.log('authInMemStorageAdapter at authController.js: ', authInMemStorageAdapter);
  });
}

module.exports = fp(authController);
