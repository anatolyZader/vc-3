// NewConverstionBtn.jsx
/* eslint-disable no-unused-vars */

import Button from '@mui/material/Button';
import './new-convers-btn.css';

function NewConversationBtn({ onNewConversation, disabled = false }) {
  const handleNewConversation = () => {
    if (onNewConversation) {
      onNewConversation();
    }
  };

  return (
    <div className="new-convers-btn">
      <Button 
        variant="outlined"
        onClick={handleNewConversation}   
        disabled={disabled}
        sx={{
          backgroundColor: 'rgba(0, 0, 0, 0)', 
          color: 'black',
          '&:hover': { backgroundColor: 'lightgrey' },
          '&:disabled': { 
            backgroundColor: 'rgba(0, 0, 0, 0.12)',
            color: 'rgba(0, 0, 0, 0.26)'
          },
          width: '70%',
          height: "70%",
          margin: '0 auto' 
        }}
      >
        New Conversation
      </Button>
    </div>
  );
}

export default NewConversationBtn;