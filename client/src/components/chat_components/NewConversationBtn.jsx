// NewConverstionBtn.jsx
/* eslint-disable no-unused-vars */

import Button from '@mui/material/Button';
import './new-convers-btn.css';
import PropTypes from 'prop-types';

const NewConversationBtn = ({ onNewConversation, disabled }) => {
  const handleNewConvers = () => {
    console.log('🔘 NewConversationBtn: Button clicked');
    onNewConversation();
  };

  return (
    <div className="new-convers-btn">
      <Button 
        variant="outlined"
        onClick={handleNewConvers}   
        disabled={disabled}
        sx={{
          backgroundColor: 'rgba(0, 0, 0, 0)', 
          color: 'black',
          '&:hover': { backgroundColor: 'lightgrey' },
          '&:disabled': { 
            backgroundColor: 'rgba(0, 0, 0, 0.12)',
            color: 'rgba(0, 0, 0, 0.26)'
          },
          width: '900%',
          height: "70%",
          margin: '10px auto' 
        }}
      >
        New Conversation
      </Button>
    </div>
  );
}

NewConversationBtn.propTypes = {
  onNewConversation: PropTypes.func,
  disabled: PropTypes.bool
};

export default NewConversationBtn;
