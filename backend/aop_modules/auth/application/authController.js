// authController.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

async function authController(fastify, options) {
  let userService;
  try {
    userService = await fastify.diContainer.resolve('userService');
  } catch (error) {
    fastify.log.error('Error resolving userService:', error);
    throw fastify.httpErrors.internalServerError(
      'Failed to resolve userService. Ensure it is registered in the DI container.',
      { cause: error }
    );
  }

  // Helper to set auth cookies uniformly
  const setAuthCookies = (reply, token) => {
    reply.setCookie('authToken', token, {
      path: '/',
      httpOnly: true,
      secure: true, // adjust to false in local dev if needed
      sameSite: 'Strict', // or 'Lax' based on your requirements
      maxAge: 60 * 60 * 24, // 1 day
    });
  };

  // works alongside the OAuth2 plugin's automatic configuration to handle a popup-based flow. Here's how they interact:

  // Client-Side Popup Flow:
  // When the user signs in via Google from your React app, the useGoogleLogin hook opens a popup where Google handles authentication. Once the user completes authentication, the popup returns an authorization code to the client.

  // POST to /auth/google-login:
  // Instead of redirecting the entire browser to the OAuth2 startRedirectPath (/auth/google), your client sends the authorization code via a POST request to /auth/google-login. This allows the Single Page Application to stay on its main route while handling authentication in the background.
  fastify.decorate('loginWithGoogle', async function (request, reply) {
    console.log('hello from authController.loginWithGoogle');
    console.log('Request body at authController.loginWithGoogle:', request.body);
    console.log('Request body:', JSON.stringify(request.body, null, 2));


 
    try {
      const { code } = request.body; // one-time code issued by Google's authorization server once a user grants your application permission (typically to a designated redirect URI). This code is temporary and can only be used once. backend server then takes this code and sends it to Google's token endpoint. In exchange, Google returns tokens (such as an access token and an ID token) that allow your application to access the user's data securely.
      console.log('Received authorization code at authController.loginWithGoogle:', code);
      console.log('Received authorization code:', JSON.stringify(code));


      if (!code) {
        return reply.badRequest('Missing Google authorization code');
      }
  
      // Copy the code from the body to the query so the oauth2 plugin can pick it up.
      request.query = { code };

      console.log('fastify.googleOAuth2 full object:', fastify.googleOAuth2);
  
      const tokenResponse = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(
        request,
        // { redirect_uri: 'postmessage' } 
        { redirect_uri: 'http://localhost:3000/auth/google/callback' }
        // Redirect URI Context:
        // In a standard OAuth2 flow, after a user authenticates with the provider (Google), the provider redirects the user back to a specific URL (the redirect URI) that you registered in your Google Cloud Console. This URI is where the authorization code is sent.
        
        // Popup Flow Adaptation:
        // In your setup, you're using a popup-based flow via the useGoogleLogin hook. In this case, the entire OAuth process occurs in a popup window, and you don't want to redirect the main browser window. Instead, the code is returned to the popup, which then communicates back to your main app.
      );
  
      console.log('Token response from Google:', tokenResponse);
      console.log('Token response from Google stringified:', JSON.stringify(tokenResponse, null, 2));
      const { id_token: googleIdToken } = tokenResponse.token; // This token contains information about the user (like email, name, and whether the email is verified). You use it immediately to verify the user’s identity by checking its signature and payload via your fastify.verifyGoogleIdToken function.
      // Lifespan:
      // It’s short-lived and used only during the authentication handshake. You don’t persist or use it for subsequent authorization in your own application.
      // { id_token: googleIdToken } - object destructuring with aliasing. It extracts the property id_token from tokenResponse.token and assigns its value to a new constant named googleIdToken
      if (!googleIdToken) {
        return reply.internalServerError('Missing ID token from Google OAuth');
      }
  
      // Verify the Google ID token
      const payload = await fastify.verifyGoogleIdToken(googleIdToken);
      console.log('Verified payload:', payload);
      if (!payload || !payload.email_verified) {
        return reply.unauthorized('Google account not verified.');
      }
  
      const email = payload.email;
      let user = await userService.getUserInfo(email);
      if (!user) {
        const username = payload.name || payload.email.split('@')[0];
        user = await userService.registerUser(
          username,
          email,
          'placeholder-password'
        );
      }
  
      const jti = uuidv4();
      const localToken = fastify.jwt.sign(
        { id: user.id, username: user.username, jti },
        { jwtid: jti, expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
      );
  
      // Set the auth cookie and return success response
      setAuthCookies(reply, localToken);
      return reply.send({
        message: 'Google login successful',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          picture: user.picture || null,
        },
      });
    } catch (error) {
      console.error('Actual Google error:', error.response?.data || error.message);
      fastify.log.error(error);
      return reply.internalServerError('Failed to process Google login');
    }
  });
// Google requires that you register a callback (redirect) URI in your GCP settings as a security measure. Even if you're primarily using a popup-based flow, under the hood the OAuth2 protocol still relies on a redirect URI to complete the token exchange. Here's why:

// Security and Trust:
// Google verifies that the authorization code is only sent to a pre-approved callback URI. This prevents malicious redirection of the token to unauthorized endpoints.

// Protocol Requirements:
// The OAuth2 standard is built around redirecting the user back to your application with an authorization code. Even if the user experience is handled via a popup, the underlying flow must have a valid callback URI.

// Fallback & Consistency:
// Having the callback route registered ensures that your application can handle both full-page redirects and popup-based flows consistently. If a full-page redirect ever occurs (or as a fallback), Google will only send the code to a registered URI.
  fastify.decorate('googleCallback', async function (request, reply) {
    try {
      console.log('>>> /auth/google/callback called with query:', request.query);

      // Exchange the authorization code for tokens.
      // **Key change:** Pass { redirect_uri: "postmessage" } to align with the popup flow.
      const tokenResponse = await this.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(
        request,
        // { redirect_uri: 'postmessage' }
        { redirect_uri: 'http://localhost:3000/auth/google/callback' }
      );
      console.log('Token response from Google:', tokenResponse);

      const { id_token: googleIdToken } = tokenResponse.token;
      if (!googleIdToken) {
        return reply.internalServerError('Missing ID token from Google OAuth');
      }

      // Verify the Google ID token
      const payload = await fastify.verifyGoogleIdToken(googleIdToken);
      if (!payload || !payload.email_verified) {
        return reply.unauthorized('Google account not verified.');
      }

      const email = payload.email;
      let user = await userService.getUserInfo(email);
      if (!user) {
        const username = payload.name || payload.email.split('@')[0];
        user = await userService.registerUser( 
          username,
          email,
          'placeholder-password'
        );
      }

      const jti = uuidv4();
      const localToken = fastify.jwt.sign(
        { id: user.id, username: user.username, jti },
        { jwtid: jti, expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
      );

      // Set auth cookie and redirect to the dashboard
      setAuthCookies(reply, localToken);
      return reply.redirect(`${fastify.secrets.APP_URL}/dashboard`);
    } catch (err) {
      console.error('>>> Google OAuth callback error:', err);
      fastify.log.error(' $$$$$$$ googleLoginError!', err); // log the full underlying error
      return reply.internalServerError('Google OAuth failed', { cause: err });
    }
  });

  // -------------------------------------------------------------------------
  
  fastify.decorate('readAllUsers', async function (request, reply) {
    try {
      const users = await userService.readAllUsers();
      return reply.send({ message: 'Users discovered!', users });
    } catch (error) {
      fastify.log.error('Error discovering users:', error);
      return reply.internalServerError('Internal Server Error', { cause: error });
    }
  });

  fastify.decorate('registerUser', async function (request, reply) {
    const { username, email, password } = request.body;
    try {
      const newUser = await userService.registerUser(username, email, password);
      return reply.send({ message: 'User registered successfully', user: newUser });
    } catch (error) {
      fastify.log.error('Error registering user:', error);
      return reply.internalServerError('Internal Server Error', { cause: error });
    }
  });

  fastify.decorate('removeUser', async function (request, reply) {
    const { email } = request.body;
    try {
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
      const user = await userService.getUserInfo(email);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return reply.unauthorized('Invalid credentials');
      }
  
      const localToken = fastify.jwt.sign(
        { id: user.id, username: user.username, jti },
        { jwtid: jti, expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
      );
  
      // Set auth cookie for manual login
      reply.setCookie('authToken', localToken, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: 60 * 60 * 24,
      });
  
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

  fastify.decorate('getUserInfo', async function (request, reply) {
    if (!request.user || !request.user.username) {
      throw fastify.httpErrors.unauthorized('User not authenticated');
    }
    return reply.send(request.user);
  });

  fastify.decorate('refreshToken', async function (request, reply) {
    try {
      const user = request.user || {};
      const localToken = fastify.jwt.sign(
        { id: user.id, username: user.username },
        { expiresIn: fastify.secrets.JWT_EXPIRE_IN || '1h' }
      );
      reply.setCookie('authToken', localToken, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: 60 * 60 * 24,
      });
      return reply.send({ token: localToken });
    } catch (error) {
      fastify.log.error('Error refreshing token:', error);
      return reply.internalServerError('Internal Server Error', { cause: error });
    }
  }); 
}

module.exports = fp(authController);
