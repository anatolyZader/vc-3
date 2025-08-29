// CustomMessage.jsx
import React from 'react';
import { Message } from '@chatscope/chat-ui-kit-react';
import SimpleMessageRenderer from './SimpleMessageRenderer';
import PropTypes from 'prop-types';

const CustomMessage = ({ model, children, ...props }) => {
  // Create a new model object with a custom payload that includes our rendered content
  const customModel = {
    ...model,
    payload: (
      <SimpleMessageRenderer 
        content={model.message} 
        isUserMessage={model.direction === 'outgoing'}
      />
    ),
    type: 'custom' // This tells the Message component to use the payload instead of message text
  };

  return (
    <Message model={customModel} {...props}>
      {children}
    </Message>
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
