/* eslint-disable no-unused-vars */
// authController.js
'use strict';

const fp = require('fastify-plugin');
const { v4: uuidv4 } = require('uuid');

let userService, sessionService, authPostgresAdapter;

async function authController(fastify, options) {

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
      if (user.password !== password) {
        const err = new Error('Wrong credentials provided');
        err.statusCode = 401;
        throw err;
      }

      // Store user in session
      request.session.user = { id: user.id, username: user.username };

      // Generate JWT token
      const token = fastify.jwt.sign(
        { id: user.id, username: user.username },
        {
          jwtid: uuidv4(),
          expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h',
        }
      );

      // Send response with token and session information
      reply.send({ message: 'Authentication successful', user: request.session.user, token });
    } catch (error) {
      fastify.log.error('Error authenticating user:', error);
      if (error.statusCode) {
        reply.status(error.statusCode).send({ error: error.message });
      } else {
        reply.status(500).send({ error: 'Internal Server Error' });
      }
    }
  });

  // Logout User
  fastify.decorate('logoutUser', async function (request, reply) {
    try {
      await request.session.destroy(); // Destroy session data
      console.log("User logged out");
      reply.code(204).send();
    } catch (error) {
      fastify.log.error('Error during logout:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Get Me (User Info)
  fastify.decorate('getMe', async function (request, reply) {
    if (!request.session || !request.session.user) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }
    reply.send(request.session.user); // Send user info from session
  });

  // Refresh Token
  fastify.decorate('refreshToken', async function (request, reply) {
    try {
      // Generate a new JWT token
      const token = await fastify.jwt.sign(
        {
          id: request.session.user.id,
          username: request.session.user.username,
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

  // Validate Session and JWT
  fastify.decorate('validateSession', async function (request, reply) {
    if (!request.session || !request.session.user) {
      reply.status(401).send({ error: 'Session is invalid or expired' });
      return;
    }
    reply.send({ message: 'Session is valid', user: request.session.user });
  });

  // Hook: onReady
  fastify.addHook('onReady', async function () {
    
    try {
      userService = fastify.diContainer.resolve('userService');
    } catch (error) {
      fastify.log.error('Error resolving userService at authController:', error);
    }

    try {
      authPostgresAdapter = fastify.diContainer.resolve('authPostgresAdapter');
    } catch (error) {
      fastify.log.error('Error resolving authPostgresAdapter at authController:', error);
    }
  });
}

module.exports = fp(authController);
