// AuthContext.jsx
'use strict';
/* eslint-disable no-unused-vars */


import PropTypes from 'prop-types';
import { createContext, useState, useEffect } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); 


  // Verify session by calling a protected endpoint that returns user info
  const verifyCookieUpdateState = async () => {
    try {
      const response = await fetch('/api/auth/me', {
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
    } finally {
      setAuthLoading(false); 
    }

  };

  const googleLogin = () => {
    // The @fastify/oauth2 plugin handles the redirect
    // by hooking onto /auth/google as startRedirectPath.
    window.location.href = '/api/auth/google';
  };

  // Development login for local testing (NODE_ENV=development)
  const devLogin = async (email = 'dev@localhost.com', username = 'Developer') => {
    try {
      const response = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username }),
        credentials: 'include', // include cookies
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Dev login successful:', result);
        // Update auth state
        setIsAuthenticated(true);
        setUserProfile(result.user);
        return { success: true, user: result.user };
      } else {
        console.error('❌ Dev login failed:', response.status);
        return { success: false, error: 'Dev login failed' };
      }
    } catch (error) {
      console.error('❌ Dev login error:', error);
      return { success: false, error: error.message };
    }
  };

  // Logout by calling backend logout endpoint and updating state
  const logout = async () => {
    try {
    
      await fetch('/api/auth/logout', {
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // THE commented-out path is for regular development on vm, it nreaks with load balancer
        // await fetch('http://localhost:3000/auth/me', {
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
  }, []); // callled immediately on component mount (using useEffect) to ensure that the app always starts by confirming the user's session state. This pattern is crucial for applications relying on cookie-based sessions

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        verifyCookieUpdateState,
        logout,
        googleLogin,
        devLogin,  // Add dev login function
        userProfile,
        authLoading,
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
