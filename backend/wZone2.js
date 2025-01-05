// // router

// fastify.route({
//     method: 'POST',
//     url: '/login',
//     schema: {
//       response: {
//         200: fastify.getSchema('schema:auth:token'),
//       },
//     },
//     handler: fastify.loginUser,
//   });

// // controller
// fastify.decorate('loginUser', async function (request, reply) {
// const { email, password } = request.body;
// console.log('Login attempt with:', { email, password }); 
// if (!email || !password) {
//     return reply.badRequest('Email and password are required');
// }  
// try {
//     const user = await userService.getUserInfo(email, authPersistAdapter);
//     if (!user || user.password !== password) {
//     return reply.unauthorized('Invalid credentials');
//     } 
//     const sessionId = uuidv4();
//     await userService.setSessionInMem(sessionId, user, authInMemStorageAdapter);
//     // keeps request.session.user in sync with your in-memory store usage.
//     request.session.user = {
//     sessionId,
//     id: user.id,
//     username: user.username,
//     };        
//     const token = fastify.jwt.sign(
//     { id: user.id, username: user.username },
//     { jwtid: sessionId, expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
//     );  
//     reply.send({ message: 'Authentication successful', token });
// } catch (error) {
//     fastify.log.error('Error logging in user:', error);
//     reply.code(500).send({ error: 'Internal Server Error' });
// }
// });

// // service
// async getUserInfo(email, authPersistAdapter) {
//     try {
//       const userInstance = new this.User();
//       const userData = await userInstance.getUserInfo(email, authPersistAdapter);
//       console.log('User retrieved successfully:', userData);
//       return userData;
//     } catch (error) {
//       console.error('Error reading user:', error);
//       throw error;
//     }
//   }

//   async setSessionInMem(sessionId, userData, authInMemStorageAdapter) {
//     try {
//       await authInMemStorageAdapter.setSessionInMem(sessionId, userData, );
//       console.log('Session stored successfully');
//     } catch (error) {
//       console.error('Error storing session:', error);
//       throw error;
//     }
//   }

// // entity/ies 
// async getUserInfo(email, IAuthPersistPort) {
//   try {
//     const userDTO = await IAuthPersistPort.getUserInfo(email);
//     console.log('User read successfully:', userDTO);
//     return userDTO;
//   } catch (error) {
//     console.error('Error reading user:', error);
//     throw error;
//   }
// }

// async setSessionInMem() {
//   try {
//     await this.IAuthInMemStoragePort.setSessionInMem(this.sessionId, this);
//     console.log('Session created successfully!');
//   } catch (error) {
//     console.error('Error creating session:', error);
//     throw error;
//   }
// }

// // port/s
// async loginUser(email, password) {
//   throw new Error("Method 'loginUser(username, password)' must be implemented.");
// }

// async setSessionInMem(sessionId, user) {
//   throw new Error('Method setSessionInMem(sessionId, user) must be implemented.');
// }

// // adapter/s

// async getUserInfo(email) {
//   console.log('Querying user with email:', email);
//   const client = await this.pool.connect();
//   try {
//     const { rows } = await client.query('SELECT * FROM users WHERE email=$1', [email]);
//     return rows.length ? rows[0] : null;
//   } catch (error) {
//     console.error('Error reading user:', error);
//     throw error;
//   } finally {
//     client.release();
//   }
// }

// async setSessionInMem(sessionId, user) {
//   try {
//     await redisClient.set(`session:${sessionId}`, JSON.stringify(user), 'EX', process.env.SESSION_TTL || 3600);
//   } catch (error) {
//     console.error('Error storing session in Redis:', error);
//     throw error;
//   }
// }

