// EditMessageModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './editMessageModal.css';

const EditMessageModal = ({ 
  isOpen, 
  message, 
  onSave, 
  onCancel,
  isLoading = false 
}) => {
  const [editedMessage, setEditedMessage] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setEditedMessage(message || '');
      // Focus and select text after modal opens
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      }, 100);
    }
  }, [isOpen, message]);

  const handleSave = () => {
    const trimmedMessage = editedMessage.trim();
    if (trimmedMessage && trimmedMessage !== message) {
      onSave(trimmedMessage);
    } else {
      onCancel(); // No changes made
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="edit-modal-overlay" onClick={onCancel}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-modal-header">
          <h3>Edit message</h3>
          <button 
            className="close-button" 
            onClick={onCancel}
            disabled={isLoading}
          >
            ×
          </button>
        </div>
        
        <div className="edit-modal-body">
          <textarea
            ref={textareaRef}
            value={editedMessage}
            onChange={(e) => setEditedMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={4}
            disabled={isLoading}
            className="edit-textarea"
          />
          
          <div className="edit-modal-hint">
            Press <kbd>Ctrl+Enter</kbd> to save, <kbd>Esc</kbd> to cancel
          </div>
        </div>
        
        <div className="edit-modal-footer">
          <button 
            className="cancel-btn" 
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            className="save-btn" 
            onClick={handleSave}
            disabled={isLoading || !editedMessage.trim() || editedMessage.trim() === message}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Saving...
              </>
            ) : (
              'Save & Regenerate'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

EditMessageModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  message: PropTypes.string,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isLoading: PropTypes.bool
};

export default EditMessageModal;
