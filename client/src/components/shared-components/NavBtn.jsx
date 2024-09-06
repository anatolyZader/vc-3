/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React from 'react';
import Button from '@mui/material/Button';
import './navbtn.css';
import { useThemeProps } from '@mui/material';


export default function NavBtn(props) {
  return <Button 
    variant="text" 
    sx={{ 
      // display: 'flex',
      // justifyContent: 'flex-start',
      textDecoration: 'none',
      border: 'none',
      backgroundColor: 'rgb(0,0,0,0)',
      color: 'black',
      '&:hover': { backgroundColor: 'lightgrey' },
      width: '100%' }}>
        {props.btnName}
    </Button>;
}


