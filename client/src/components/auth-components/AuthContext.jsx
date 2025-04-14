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
      const response = await fetch('http://localhost:3000/auth/me', {
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

  const googleLogin = () => {
    // The @fastify/oauth2 plugin handles the redirect
    // by hooking onto /auth/google as startRedirectPath.
    window.location.href = 'http://localhost:3000/auth/google';
  };

  // Logout by calling backend logout endpoint and updating state
  const logout = async () => {
    try {
      await fetch('http://localhost:3000/auth/logout', {
        method: 'POST',
        credentials: 'include', // so it sends the auth cookie
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    // Clear local auth state
    setIsAuthenticated(false);
    setUserProfile(null);
    // If using @react-oauth/google, also sign out of Google
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
        logout
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
