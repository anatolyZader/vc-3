// StartConversBtn.js

import Button from '@mui/material/Button';
import AddCommentIcon from '@mui/icons-material/AddComment';
import './startConversBtn.css';

function StartConversBtn({ onClick, disabled = false }) {
  return (
    <div className="start-conversation-btn-container">
      <Button 
        variant="contained"
        onClick={onClick}
        disabled={disabled}
        startIcon={<AddCommentIcon />}
        sx={{
          backgroundColor: '#28a745',
          color: 'white',
          '&:hover': { 
            backgroundColor: '#218838' 
          },
          '&:disabled': {
            backgroundColor: '#6c757d'
          },
          marginRight: '10px',
          textTransform: 'none',
          fontWeight: 500
        }}
      >
        New Chat
      </Button>
    </div>
  );
}

export default StartConversBtn;