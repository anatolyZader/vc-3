// AuthContext.jsx
'use strict';
import PropTypes from 'prop-types';
import { createContext, useState, useEffect } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  // Manual login logic
  const verifyCookie = () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsAuthenticated(true);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserProfile(null);
    localStorage.removeItem('authToken');
    googleLogout(); // Log out of Google as well
  };

  // Google login logic
  const googleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        const tokenFromGoogle = response.access_token;
        const serverResponse = await fetch('/auth/google-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenFromGoogle }),
          credentials: 'include', // Important to include cookies in the request
        });
  
        const data = await serverResponse.json();
        if (data.token) {
          setIsAuthenticated(true);
        }
  
        if (data.user) {
          setUserProfile(data.user);
        }
      } catch (error) {
        console.log('Google login failed:', error);
      }
    },
    onError: (error) => console.log('Google login failed:', error),
  });

  // Check for an existing manual login token on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        verifyCookie,
        logout,
        googleLogin,
        userProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Add propTypes validation
AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export { AuthContext, AuthProvider };
