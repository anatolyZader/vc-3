// Chat.jsx

import {
  MainContainer,
  ChatContainer,
  ConversationHeader,
  MessageList,
  MessageInput,
  Sidebar,
  ExpansionPanel,
  Avatar,
  TypingIndicator,
  MessageSeparator,
  Message,
  SendButton
} from '@chatscope/chat-ui-kit-react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import '../custom-overrides.css';
import './chat.css';
import { useEffect, useState } from 'react';
import io from 'socket.io-client';
// import emilyIco from './emilyIco.svg';
import stitch from './stitch.jpg';


const SOCKET_SERVER_URL = 'http://localhost:3001';

const Chat = () => {
  const [socket, setSocket] = useState(null);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
    });

    newSocket.on('message', (msg) => {
      console.log('Received message:', msg);
    });

    newSocket.on('typing', () => {
      setTyping(true);
      setTimeout(() => setTyping(false), 2000);
    });

    return () => newSocket.disconnect();
  }, []);

  const handleSend = (messageText) => {
    if (!socket) return;
    const message = {
      message: messageText,
      sentTime: new Date().toLocaleTimeString(),
      sender: "You",
      direction: "outgoing",
      position: "single"
    };
    socket.emit('message', message);
  };

  return (
    <MainContainer className='main-container'>
          <Sidebar className='sidebar' position="left">
        <ExpansionPanel open title="History">
          <p>Lorem ipsum</p>
          <p>Lorem ipsum</p>
        </ExpansionPanel>
        <ExpansionPanel title="Preferences">
          <p>Lorem ipsum</p>
          <p>Lorem ipsum</p>
        </ExpansionPanel>
      </Sidebar>

      <ChatContainer className='chat-container'>
        <ConversationHeader>
          <Avatar src={stitch} name="aiAssistant" />
          <ConversationHeader.Content userName="aiAssistant" />
          <ConversationHeader.Actions>
            <SendButton border />
          </ConversationHeader.Actions>
        </ConversationHeader>

        <MessageList typingIndicator={typing && <TypingIndicator content="Emily is typing" />}>
          <MessageSeparator content="Saturday, 30 November 2019" />
          <Message model={{
            message: "Hello my friend",
            sentTime: "15 mins ago",
            sender: "aiAssistant",
            direction: "incoming",
            position: "single"
          }}>
            <Avatar src={stitch} name="aiAssistant" />
          </Message>
          {/* Add more messages as needed */}
        </MessageList>

        <MessageInput
          className="message-input"
          placeholder="Enter prompt here"
          onSend={handleSend}
          responsive
        />

      </ChatContainer>

    </MainContainer>
  );
};

export default Chat;
