/* eslint-disable no-unused-vars */
import React, { useContext } from 'react';
import Button from '@mui/material/Button';
import { AuthContext } from '../auth_components/AuthContext';  
import './logoutbtn.css';

function LogoutBtn() {
  const { logout } = useContext(AuthContext);  

  return (
    <div className="logout-btn">
      <Button 
        variant="outlined"
        onClick={logout}   
        sx={{
          backgroundColor: 'rgba(0, 0, 0, 0)', 
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
