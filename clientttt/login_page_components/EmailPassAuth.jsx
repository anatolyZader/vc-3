import React, { useState } from 'react';
import { TextField, Button, Alert, Box } from '@mui/material';

const EmailPasswordAuth = ({ onProceedToVerification }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Include cookies for session
      });

      if (response.ok) {
        onProceedToVerification(email); // Pass email to the parent for verification step
        setLoginError(null);
      } else {
        const data = await response.json();
        setLoginError(data.message || 'Invalid credentials');
      }
    } catch (error) {
      setLoginError('An error occurred during login. Please try again.');
    }
  };

  return (
    <form onSubmit={handleLogin}>
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
      <Button type="submit" variant="contained" color="primary" fullWidth>
        Manual Login
      </Button>
    </form>
  );
};

export default EmailPasswordAuth;
