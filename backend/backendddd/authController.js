/* eslint-disable no-unused-vars */
// authController.js
'use strict';

const fp = require('fastify-plugin');
const { v4: uuidv4 } = require('uuid');

let userService, accountService, sessionService, authPostgresAdapter;

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
  
      // Set token in httpOnly cookie
      reply
        .setCookie('authToken', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', // Secure cookie in production
          sameSite: 'strict', // Prevent CSRF
          path: '/', // Cookie available across the app
        })
        .send({ message: 'Authentication successful', user: request.session.user });
    } catch (error) {
      fastify.log.error('Error authenticating user:', error);
      if (error.statusCode) {
        reply.status(error.statusCode).send({ error: error.message });
      } else {
        reply.status(500).send({ error: 'Internal Server Error' });
      }
    }
  });
  
  // Google OAuth2 Login
  fastify.decorate('loginWithGoogle', async function (request, reply) {
    const { token } = request.body;
  
    try {
      const user = await userService.verifyGoogleToken(token, authPostgresAdapter);
  
      if (!user) {
        reply.status(401).send({ error: 'Invalid Google token' });
        return;
      }
  
      // Store user in session
      request.session.user = { id: user.id, email: user.email };
  
      // Generate JWT token
      const jwtToken = fastify.jwt.sign(
        { id: user.id, email: user.email },
        {
          jwtid: uuidv4(),
          expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h',
        }
      );
  
      // Set token in httpOnly cookie
      reply
        .setCookie('authToken', jwtToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', // Secure cookie in production
          sameSite: 'strict', // Prevent CSRF
          path: '/', // Cookie available across the app
        })
        .send({ message: 'Google login successful', user: request.session.user });
    } catch (error) {
      fastify.log.error('Error during Google login:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
  

  // Initiate Two-Stage Verification
  fastify.decorate('initiateTwoStageVerification', async function (request, reply) {
    const { email } = request.body;

    try {
      const code = await userService.generateVerificationCode(email, authPostgresAdapter);
      // Send code via email/SMS
      await userService.sendVerificationCode(email, code);
      reply.send({ message: 'Verification code sent' });
    } catch (error) {
      fastify.log.error('Error initiating two-stage verification:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Verify Two-Stage Code
  fastify.decorate('verifyTwoStageCode', async function (request, reply) {
    const { email, code } = request.body;

    try {
      const isValid = await userService.verifyCode(email, code, authPostgresAdapter);

      if (!isValid) {
        reply.status(401).send({ error: 'Invalid verification code' });
        return;
      }

      // Mark session as verified
      request.session.verified = true;
      reply.send({ message: 'Verification successful' });
    } catch (error) {
      fastify.log.error('Error verifying two-stage code:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('logoutUser', async function (request, reply) {
    try {
      await request.session.destroy(); // Destroy session data
      reply.code(204).send();
    } catch (error) {
      fastify.log.error('Error during logout:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('getMe', async function (request, reply) {
    if (!request.session || !request.session.user) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }
    reply.send(request.session.user); // Send user info from session
  });

  fastify.decorate('refreshToken', async function (request, reply) {
    try {
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

  fastify.decorate('validateSession', async function (request, reply) {
    if (!request.session || !request.session.user) {
      reply.status(401).send({ error: 'Session is invalid or expired' });
      return;
    }
    reply.send({ message: 'Session is valid', user: request.session.user });
  });

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
