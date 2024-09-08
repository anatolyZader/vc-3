/* eslint-disable no-unused-vars */
import React from 'react';
import Button from '@mui/material/Button';
import './logoutbtn.css';

function LogoutBtn() {
  return (
    <div className="logout-btn">
      <Button 
        variant="outlined"
        onClick={() => console.log("logging out")} 
        sx={{
          backgroundColor: 'rgba(0, 0, 0, 0)', // Correct transparency format
          color: 'black',
          '&:hover': { backgroundColor: 'lightgrey' },
          width: '100%'
        }}
      >
        Logout
      </Button>
    </div>
  );
}

export default LogoutBtn;
