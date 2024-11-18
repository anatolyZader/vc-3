import React from 'react';
import { Button } from '@mui/material';

const Logout = ({ onLogout }) => {
  return (
    <Button
      variant="outlined"
      color="secondary"
      fullWidth
      onClick={onLogout}
      sx={{ mt: 2 }}
    >
      Logout
    </Button>
  );
};

export default Logout;
