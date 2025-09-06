// authController.js
/* eslint-disable no-unused-vars */
'use strict';

const util = require('util');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const fp = require('fastify-plugin');

async function authController(fastify, options) {

  // Helper to set auth cookies uniformly
  const setAuthCookies = (reply, token) => {
    const cookieSecure = process.env.NODE_ENV === 'staging';
    const cookieSameSite = cookieSecure ? 'None' : 'Lax';
    reply.setCookie('authToken', token, {
      path: '/',
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      maxAge: 60 * 60 * 24, // 1 day
    });
  };

  // -------------------------------------------------------------------------
  
  fastify.decorate('readAllUsers', async function (request, reply) {
    try {
      const userService = await request.diScope.resolve('userService');
      const users = await userService.readAllUsers();
      return reply.send({ message: 'Users discovered!', users });
    } catch (error) {
      this.log.error('Error discovering users:', error);
      return reply.internalServerError('Internal Server Error', { cause: error });
    }
  });

    fastify.decorate('getUserInfo', async function (request, reply) {
    if (!request.user || !request.user.username) {
      throw fastify.httpErrors.unauthorized('User not authenticated');
    }
    return reply.send(request.user);
  });

  fastify.decorate('registerUser', async function (request, reply) {
    const { username, email, password } = request.body;
    try {
      const userService = await request.diScope.resolve('userService');
      const newUser = await userService.registerUser(username, email, password);
      return reply.send({ message: 'User registered successfully', user: newUser });
    } catch (error) {
      fastify.log.error('Error registering user:', error);
      return reply.internalServerError('Internal Server Error', { cause: error });
    }
  });

  fastify.decorate('removeUser', async function (request, reply) {
    const { email } = request.query;
    try {
      const userService = await request.diScope.resolve('userService');
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
      const userService = await request.diScope.resolve('userService');
      const user = await userService.getUserInfo(email);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return reply.unauthorized('Invalid credentials');
      }
  
      const authToken = fastify.jwt.sign(
        { id: user.id, username: user.username, jti },
        { jwtid: jti, expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
      );
  
  // Set auth cookie for manual login
  setAuthCookies(reply, authToken);
  
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

  fastify.decorate('refreshToken', async function (request, reply) {
    try {
      const user = request.user || {};
      const authToken = fastify.jwt.sign(
        { id: user.id, username: user.username },
        { expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
      );
  setAuthCookies(reply, authToken);
      return reply.send({ token: authToken });
    } catch (error) {
      fastify.log.error('Error refreshing token:', error);
      return reply.internalServerError('Internal Server Error', { cause: error });
    }
  }); 
}

module.exports = fp(authController);