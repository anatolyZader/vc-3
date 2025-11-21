// MessageActions.jsx
import React from 'react';
import PropTypes from 'prop-types';
import './messageActions.css';

const MessageActions = ({ message, onCopy, onEdit, isUserMessage = false }) => {
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(message.message);
    onCopy && onCopy();
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit && onEdit();
  };

  // Only show actions for user messages
  if (!isUserMessage) {
    return null;
  }

  return (
    <div className="message-actions">
      <button
        className="message-action-btn copy-btn"
        onClick={handleCopy}
        title="Copy message"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
        </svg>
      </button>
      
      <button
        className="message-action-btn edit-btn"
        onClick={handleEdit}
        title="Edit message"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
      </button>
    </div>
  );
};

MessageActions.propTypes = {
  message: PropTypes.object.isRequired,
  onCopy: PropTypes.func,
  onEdit: PropTypes.func,
  isUserMessage: PropTypes.bool
};

export default MessageActions;
