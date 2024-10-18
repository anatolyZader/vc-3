/* eslint-disable no-unused-vars */
// authController.js
'use strict';

const fp = require('fastify-plugin');
const { v4: uuidv4 } = require('uuid');

let userService, accountService, sessionService, authPostgresAdapter;

async function authController(fastify, options) {
  // Discover Users
  fastify.decorate('discoverUsers', async function (request, reply) {
    if (!userService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    fastify.log.info('Headers:', request.headers);
    fastify.log.info('Content-Type:', request.headers['content-type']);
    fastify.log.info('Received body:', request.body);

    try {
      const users = await userService.readUsers(authPostgresAdapter);
      reply.send({ message: 'Users discovered!', users });
    } catch (error) {
      fastify.log.error('Error discovering users:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Register User
  fastify.decorate('registerUser', async function (request, reply) {
    if (!userService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    if (
      !request.body ||
      !request.body.username ||
      !request.body.email ||
      !request.body.password
    ) {
      reply.status(400).send({ error: 'Invalid request payload' });
      return;
    }
    const { username, email, password } = request.body;
    try {
      const newUser = await userService.register(
        username,
        email,
        password,
        authPostgresAdapter
      );
      reply.send({ message: 'User registered successfully', user: newUser });
    } catch (error) {
      fastify.log.error('Error registering user:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Login User
  fastify.decorate('loginUser', async function (request, reply) {
    if (!userService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    const { username, password } = request.body;
    try {
      const user = await userService.readUser(username, authPostgresAdapter);

      if (!user) {
        reply.status(404).send({ error: 'User not found' });
        return;
      }
      console.log('User found!');
      if (user.password !== password) {
        const err = new Error('Wrong credentials provided');
        err.statusCode = 401;
        throw err;
      }

      // Assign user data to a custom property to avoid conflicts
      request.authenticatedUser = user;

      // Generate JWT token
      const token = fastify.jwt.sign(
        { id: user.id, username: user.username },
        {
          jwtid: uuidv4(),
          expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h',
        }
      );

      // Send response with token
      reply.send({ message: 'Authentication successful', token });
    } catch (error) {
      fastify.log.error('Error authenticating user:', error);
      if (error.statusCode) {
        reply.status(error.statusCode).send({ error: error.message });
      } else {
        reply.status(500).send({ error: 'Internal Server Error' });
      }
    }
  });

  // Remove User
  fastify.decorate('removeUser', async function (request, reply) {
    if (!userService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    const { username, password } = request.body;
    try {
      await userService.removeUser(username, password, authPostgresAdapter);
      reply.send({ message: 'User removed successfully' });
    } catch (error) {
      fastify.log.error('Error removing user:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Get Me (User Info)
  fastify.decorate('getMe', async function (request, reply) {
    // Use the jwtPayload attached by @fastify/jwt
    reply.send(request.jwtPayload);
  });

  // Refresh Token
  fastify.decorate('refreshToken', async function (request, reply) {
    try {
      const token = await fastify.jwt.sign(
        {
          id: request.jwtPayload.id,
          username: request.jwtPayload.username,
        },
        {
          jwtid: uuidv4(),
          expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h',
        }
      );
      reply.send({ token });
    } catch (error) {
      fastify.log.error('Error refreshing token:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Logout User
  fastify.decorate('logoutUser', async function (request, reply) {
    request.revokeToken();
    reply.code(204).send();
  });

  // Create Account
  fastify.decorate('createAccount', async function (request, reply) {
    if (!accountService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    const { userId, accountType } = request.body;
    try {
      const newAccount = await accountService.createAccount(
        userId,
        accountType
      );
      reply.send({ message: 'Account created successfully', account: newAccount });
    } catch (error) {
      fastify.log.error('Error creating account:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Add Video to Account
  fastify.decorate('addVideoToAccount', async function (request, reply) {
    if (!accountService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    const { accountId, videoYoutubeId } = request.body;
    try {
      await accountService.addVideoToAccount(accountId, videoYoutubeId);
      reply.send({ message: 'Video added to account successfully' });
    } catch (error) {
      fastify.log.error('Error adding video to account:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Remove Video from Account
  fastify.decorate('removeVideoFromAccount', async function (request, reply) {
    if (!accountService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    const { accountId, videoYoutubeId } = request.body;
    try {
      await accountService.removeVideoFromAccount(accountId, videoYoutubeId);
      reply.send({ message: 'Video removed from account successfully' });
    } catch (error) {
      fastify.log.error('Error removing video from account:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Create Session
  fastify.decorate('createSession', async function (request, reply) {
    if (!sessionService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    const { userId } = request.body;
    try {
      const newSession = await sessionService.createSession(userId);
      reply.send({ message: 'Session created successfully', session: newSession });
    } catch (error) {
      fastify.log.error('Error creating session:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Validate Session
  fastify.decorate('validateSession', async function (request, reply) {
    if (!sessionService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    const { sessionId } = request.params;
    try {
      const isValid = await sessionService.validateSession(sessionId);
      if (isValid) {
        reply.send({ message: 'Session is valid' });
      } else {
        reply.status(401).send({ error: 'Session is invalid or expired' });
      }
    } catch (error) {
      fastify.log.error('Error validating session:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Hook: onReady
  fastify.addHook('onReady', async function () {
    try {
      userService = fastify.diContainer.resolve('userService');
    } catch (error) {
      fastify.log.error('Error resolving userService at authController:', error);
    }
    try {
      accountService = fastify.diContainer.resolve('accountService');
    } catch (error) {
      fastify.log.error('Error resolving accountService at authController:', {
        error: error.message,
        stack: error.stack,
        resolutionContext: 'accountService',
      });
    }
    try {
      authPostgresAdapter = fastify.diContainer.resolve('authPostgresAdapter');
    } catch (error) {
      fastify.log.error('Error resolving authPostgresAdapter at authController:', error);
    }
  });
}

module.exports = fp(authController);
