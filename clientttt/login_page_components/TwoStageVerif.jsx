import React, { useState } from 'react';
import { TextField, Button, Alert, Box } from '@mui/material';

const TwoStageVerification = ({ email, onVerify, onBackToLogin }) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState(null);

  const handleVerification = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, verificationCode }),
        credentials: 'include', // Include cookies for session
      });

      if (response.ok) {
        onVerify(); // Inform parent component of successful verification
        setVerificationError(null);
      } else {
        const data = await response.json();
        setVerificationError(data.message || 'Invalid verification code');
      }
    } catch (error) {
      setVerificationError('An error occurred during verification. Please try again.');
    }
  };

  return (
    <Box>
      <form onSubmit={handleVerification}>
        <Box sx={{ mb: 2 }}>
          <TextField
            label="Verification Code"
            variant="outlined"
            fullWidth
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            required
          />
        </Box>
        {verificationError && <Alert severity="error">{verificationError}</Alert>}
        <Button type="submit" variant="contained" color="primary" fullWidth>
          Verify
        </Button>
      </form>
      <Button
        onClick={onBackToLogin}
        variant="text"
        color="secondary"
        fullWidth
        sx={{ mt: 2 }}
      >
        Back to Login
      </Button>
    </Box>
  );
};

export default TwoStageVerification;
