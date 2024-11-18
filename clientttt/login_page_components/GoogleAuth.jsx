import React from 'react';
import { Button } from '@mui/material';

const GoogleAuth = ({ onGoogleLogin }) => {
  return (
    <Button
      variant="contained"
      color="primary"
      fullWidth
      onClick={onGoogleLogin}
      sx={{ mb: 2 }}
    >
      Sign in with Google 🚀
    </Button>
  );
}; 

export default GoogleAuth;
