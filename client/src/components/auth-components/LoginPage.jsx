// LoginPage.jsx
'use strict';

import { useContext, useState } from 'react';
import { AuthContext } from './AuthContext';
import { TextField, Button, Typography, Box, Alert } from '@mui/material';

const LoginPage = () => {
  const { verifyCookie, googleLogin, logout, userProfile, isAuthenticated } = useContext(AuthContext);

  // State for manual login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(null);

// Handle manual login form submission
const handleManualLogin = async (e) => {
  e.preventDefault();
  try {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include', // Ensure cookies are sent with the request
    });

    if (response.ok) {
      // If login is successful, check the cookie for authentication status
      verifyCookie(); // This function could check if the cookie exists or is valid
    } else {
      setLoginError('Invalid credentials. Please try again.');
    }
  } catch (error) {
    setLoginError('An error occurred during login. Please try again later.');
  }
};

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Login Panel
      </Typography>

      {!isAuthenticated ? (
        <Box>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={() => googleLogin()}
            sx={{ mb: 2 }}
          >
            Sign in with Google 🚀
          </Button>

          <form onSubmit={handleManualLogin}>
            <Box sx={{ mb: 2 }}>
              <TextField
                label="Email"
                variant="outlined"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <TextField
                label="Password"
                type="password"
                variant="outlined"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Box>
            {loginError && <Alert severity="error">{loginError}</Alert>}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2 }}
            >
              Manual Login
            </Button>
          </form>
        </Box>
      ) : (
        <Box>
          <Typography variant="h6" gutterBottom>
            User is logged in
          </Typography>
          {userProfile && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img
                src={userProfile.picture}
                alt="user"
                style={{ width: 100, height: 100, borderRadius: '50%', marginBottom: '16px' }}
              />
              <Typography>Name: {userProfile.name}</Typography>
              <Typography>Email: {userProfile.email}</Typography>
            </Box>
          )}
          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            onClick={logout}
            sx={{ mt: 2 }}
          >
            Logout
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default LoginPage;
