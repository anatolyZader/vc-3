/* eslint-disable react/prop-types */
import { createContext, useState, useEffect } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';


const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [googleUser, setGoogleUser] = useState(null);

  // Manual login logic
  const login = () => {
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
    onSuccess: (response) => setGoogleUser(response),
    onError: (error) => console.log('Google login failed:', error),
  });

  // Fetch Google user profile when a Google login happens
  useEffect(() => {
    if (googleUser) {
        fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${googleUser.access_token}`, {
          headers: {
            Authorization: `Bearer ${googleUser.access_token}`,
            Accept: 'application/json',
          },
        })
        .then((res) => {
          setUserProfile(res.data);
          setIsAuthenticated(true); // Set as authenticated after fetching profile
        })
        .catch((err) => console.log(err));
    }
  }, [googleUser]);

  // Check for an existing manual login token on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, googleLogin, userProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
