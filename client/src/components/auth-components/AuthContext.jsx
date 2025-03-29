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
        credentials: 'include', // include cookies
      });
      if (response.ok) {
        const user = await response.json();
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

  // Google login using the access token returned from the SDK
  const googleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        const tokenFromGoogle = response.access_token;
        // Send token to backend for verification and local JWT issuance
        const serverResponse = await fetch('/auth/google-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenFromGoogle }),
          credentials: 'include', // ensure cookies are included
        });
        if (serverResponse.ok) {
          // After backend sets cookie, update the app state
          await verifyCookieUpdateState();
        }
      } catch (error) {
        console.log('Google login failed:', error);
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
  }, []);

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
