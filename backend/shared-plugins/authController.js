/* eslint-disable no-unused-vars */
// authController.js
const fp = require('fastify-plugin');

let userService, accountService, sessionService, authPostgresAdapter;

async function authController(fastify, options) {

  // console.log('Schema for "schema:auth:register retreived at authController.js":', fastify.getSchema('schema:auth:register'));

  
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
      reply.send({ message: 'users discovered!'});
    } catch (error) {
      fastify.log.error('Error discovering users:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  })



  fastify.decorate('registerUser', async function (request, reply) {
    if (!userService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    fastify.log.info('Headers:', request.headers);
    fastify.log.info('Content-Type:', request.headers['content-type']);
    fastify.log.info('Received body:', request.body);
    console.log('request: ', request)
    if (!request.body || !request.body.username || !request.body.email || !request.body.password) {
      reply.status(400).send({ error: 'Invalid request payload' });
      return;
    }
    const { username, email, password } = request.body;
    try {
      const newUser = await userService.register(username, email, password, authPostgresAdapter);
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
      console.log("User found!"); 
      if (user.password !== password) {
        const err = new Error('Wrong credentials provided');
        err.statusCode = 401;
        throw err;
      }
      reply.send({ message: 'Authentication successful', user });
      request.user = user // make the authenticated user data available throughout the rest of the request lifecycle. 1) Subsequent actions during the request:  By assigning user to request.user, you are making this data accessible to other methods, hooks, or middlewares that may need user information. 2) Token generation: In the next step of login flow, the request.user object is used to generate the JWT token.  
      return fastify.refreshToken(request, reply) // using the refreshToken method in your login process, even when a user logs in and receives a token for the first time, because it standardizes the process of generating and returning a JWT token across different scenarios (both login and token refresh).
    } catch (error) {
      fastify.log.error('Error authenticating user:', error); 
      if (error.statusCode) {
        reply.status(error.statusCode).send({ error: error.message });
      } else {
        reply.status(500).send({ error: 'Internal Server Error' });
      }
    }
  });


// -----------------------------------------------------------------------------------
// TO FIX :






fastify.decorate('getMe', async function (request, reply) {
  return request.user
})





 

  // Once authenticated, generate more tokens without providing  username and password
  fastify.decorate('refreshToken', async function (request, reply) {  
    const token = await request.generateToken()  
    return { token }
  })
  
  
  fastify.decorate('getMe', async function (request, reply) {
    return request.user
  })


  fastify.decorate('logoutUser', async function (request, reply) {
      request.revokeToken() 
      reply.code(204)  
  })




// ----------------------------------------------------------------------

  
  fastify.decorate('removeUser', async function (request, reply) {
    if (!userService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    const { username, password } = request.body;
    try {
      await userService.remove(username, password);
      reply.send({ message: 'User removed successfully' });

    } catch (error) {
      fastify.log.error('Error registering user:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });



// -----------------------------------------------------------------------------------------------

    fastify.decorate('createAccount', async function (request, reply) {
      if (!accountService) {
        reply.status(500).send({ error: 'Service not initialized' });
        return;
      }  
      const { userId, accountType } = request.body;
      try {
        const newAccount = await accountService.createAccount(userId, accountType);
        reply.send({ message: 'Account created successfully', account: newAccount });
      } catch (error) {
        fastify.log.error('Error creating account:', error);
        reply.status(500).send({ error: 'Internal Server Error' });
      }
    });
  
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

    fastify.addHook('onReady', async function () {
      try {
        userService = fastify.diContainer.resolve('userService');
        // console.log('userService at authController / onReady:', userService);
      } catch (error) {
        fastify.log.error('Error resolving userService at authController:', error);
      }
      try {
        accountService = fastify.diContainer.resolve('accountService');
        // console.log('accountService at authController / onReady:', accountService);
      } catch (error) {
        fastify.log.error('Error resolving accountService at authController:', {
          error: error.message,
          stack: error.stack,
          resolutionContext: 'accountService'
        });
      }
      try {
        authPostgresAdapter = fastify.diContainer.resolve('authPostgresAdapter');
        // console.log('authPostgresAdapter at authController / onReady:', authPostgresAdapter);
      } catch (error) {
        fastify.log.error('Error resolving authPostgresAdapter at authController:', error);
      }
    });
  
}

module.exports = fp(authController);
