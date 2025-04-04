// AuthContext.jsx
'use strict';

import PropTypes from 'prop-types';
import { createContext, useState, useEffect } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  // Verify session by calling a protected endpoint that returns user info
  const verifyCookieUpdateState = async () => {
    try {
      const response = await fetch('/auth/me', {
        method: 'GET',
        credentials: 'include', // include cookies, ensures that cookies are sent with every request.
      });
      if (response.ok) {
        const user = await response.json(); 
        console.log('user fetched at AuthContext / verifyCookieUpdateState:', user);
        setIsAuthenticated(true);
        setUserProfile(user);
      } else {
        setIsAuthenticated(false);
        setUserProfile(null);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUserProfile(null);
    }
  };

  // Google login using the authorization code flow
  const googleLogin = useGoogleLogin({
    flow: 'auth-code', // involves a two-step process. First, your app receives an authorization code; then it exchanges that code for an access token.
    onSuccess: async (response) => {
      try {
        // Extract the authorization code from the response
        const codeFromGoogle = response.code;
        // Send the code to the backend for token exchange
       const serverResponse = await fetch('http://localhost:3000/auth/google-login', {
        // const serverResponse = await fetch('/auth/google-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeFromGoogle }),
          credentials: 'include',
        });
        if (serverResponse.ok) {
          await verifyCookieUpdateState();
        } else {
          console.error('Google login failed on server side');
        }
      } catch (error) {
        console.error('Google login failed:', error);
      }
    },
    onError: (error) => console.log('Google login failed:', error),
  });
  


  // Logout by calling backend logout endpoint and updating state
  const logout = async () => {
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    setIsAuthenticated(false);
    setUserProfile(null);
    googleLogout();
  };


  useEffect(() => {
    verifyCookieUpdateState();
  }, []); // called immediately on component mount (using useEffect) to ensure that the app always starts by confirming the user's session state. This pattern is crucial for applications relying on cookie-based sessions

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        verifyCookieUpdateState,
        logout,
        googleLogin,
        userProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export { AuthContext, AuthProvider };
