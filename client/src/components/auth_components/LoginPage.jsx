// LoginPage.jsx
'use strict';

import { useContext, useState } from 'react';
import { AuthContext } from './AuthContext'; // AuthContext object created in another module, enabling access to authentication state and functions.
import { TextField, Button, Typography, Box, Alert } from '@mui/material';

const LoginPage = () => {
  const {
    verifyCookieUpdateState,
    googleLogin,      
    logout,
    userProfile,
    isAuthenticated
  } = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(null);

  // Handle manual login form submission; the backend will set the auth cookie
  const handleManualLogin = async (e) => {
    e.preventDefault();
    // Use FormData to capture browser-autofilled values reliably
    const formData = new FormData(e.currentTarget);
    const emailValue = formData.get('email')?.toString() || '';
    const passwordValue = formData.get('password')?.toString() || '';
    // Keep local state in sync for UX/debugging
    if (emailValue !== email) setEmail(emailValue);
    if (passwordValue !== password) setPassword(passwordValue);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue, password: passwordValue }),
        credentials: 'include', // include cookies
      });
      if (response.ok) {
        await verifyCookieUpdateState();
      } else {
        setLoginError('Invalid credentials. Please try again.');
      }
    } catch (error) {
      setLoginError('An error occurred during login. Please try again later.');
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', p: 3 }}>

      {!isAuthenticated ? (
        <Box>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={googleLogin}  // Redirect flow triggered here
            sx={{ mb: 2 }}
          >
            Sign in with Google 
          </Button>

      <form onSubmit={handleManualLogin} autoComplete="on">
            <Box sx={{ mb: 2 }}>
              <TextField
                label="Email"
                variant="outlined"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
        name="email"
        autoComplete="email"
        InputLabelProps={{ shrink: true }}
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
        name="password"
        autoComplete="current-password"
        InputLabelProps={{ shrink: true }}
                required
              />
            </Box>
            {loginError && <Alert severity="error">{loginError}</Alert>}
            <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
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
          <Button variant="outlined" color="secondary" fullWidth onClick={logout} sx={{ mt: 2 }}>
            Logout
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default LoginPage;
