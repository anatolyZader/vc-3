/* eslint-disable no-unused-vars */
import Button from '@mui/material/Button';
import './pauseanalyzebtn.css';

export default function PauseAnalyzeBtn() {
  return <Button 
        variant="text" 
        sx={{ 
          border: 'none',
          marginTop: '50px',
          backgroundColor: 'rgb(0,0,0,0.1)',
          color: 'black',
          '&:hover': { backgroundColor: 'lightgrey' },
          width: '100%' }}>
            pause and analyze!
    </Button>;

}


