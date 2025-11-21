// CustomMessage.jsx
import React, { useState } from 'react';
import { Message } from '@chatscope/chat-ui-kit-react';
import SimpleMessageRenderer from './SimpleMessageRenderer';
import AnimatedMessageRenderer from './AnimatedMessageRenderer';
import MessageActions from './MessageActions';
import EditMessageModal from './EditMessageModal';
import PropTypes from 'prop-types';
import './messageActions.css';

const CustomMessage = ({ model, children, onEditMessage, ...props }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  
  const isUserMessage = model.direction === 'outgoing';

  const handleCopyMessage = () => {
    setShowCopyFeedback(true);
    setTimeout(() => setShowCopyFeedback(false), 2000);
  };

  const handleEditMessage = () => {
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (newMessage) => {
    setIsEditModalOpen(false);
    if (onEditMessage) {
      onEditMessage(model, newMessage);
    }
  };

  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
  };

  // Create a new model object with a custom payload that includes our rendered content
  const customModel = {
    ...model,
    payload: (
      <div className="message-with-actions">
        {isUserMessage ? (
          <SimpleMessageRenderer 
            content={model.message} 
            isUserMessage={isUserMessage}
          />
        ) : (
          <AnimatedMessageRenderer 
            content={model.message} 
            isUserMessage={isUserMessage}
            enableAnimation={!model.isFromHistory} // Only animate if NOT from history
            animationSpeed={25} // Faster animation - 25ms between words
          />
        )}
        {isUserMessage && (
          <MessageActions
            message={model}
            onCopy={handleCopyMessage}
            onEdit={handleEditMessage}
            isUserMessage={isUserMessage}
          />
        )}
        {showCopyFeedback && (
          <div className="copy-feedback">Copied!</div>
        )}
      </div>
    ),
    type: 'custom' // This tells the Message component to use the payload instead of message text
  };

  return (
    <>
      <Message model={customModel} {...props}>
        {children}
      </Message>
      
      <EditMessageModal
        isOpen={isEditModalOpen}
        message={model.message}
        onSave={handleSaveEdit}
        onCancel={handleCancelEdit}
      />
    </>
  );
};

CustomMessage.propTypes = {
  model: PropTypes.shape({
    message: PropTypes.string.isRequired,
    direction: PropTypes.oneOf(['incoming', 'outgoing']).isRequired,
    sender: PropTypes.string,
    sentTime: PropTypes.string,
    position: PropTypes.string
  }).isRequired,
  children: PropTypes.node
};

export default CustomMessage;
