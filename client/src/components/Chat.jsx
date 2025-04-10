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
import stitch from './stitch.jpg';

const getSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/ws/chat`;
};

const SOCKET_SERVER_URL = getSocketUrl();


const Chat = () => {
  const [socket, setSocket] = useState(null);
  const [typing, setTyping] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);

  useEffect(() => {
    // FASTIFY WS: Using native WebSocket instead of socket.io
    const newSocket = new WebSocket(SOCKET_SERVER_URL);
    setSocket(newSocket);

    // FASTIFY WS: Handle connection open
    newSocket.onopen = () => {
      console.log('Connected to WebSocket server');
    };

    // FASTIFY WS: Handle incoming messages (assuming a JSON structure with an "event" field)
    newSocket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.event === 'message') {
          console.log('Received message:', msg.data);
        } else if (msg.event === 'typing') {
          setTyping(true);
          setTimeout(() => setTyping(false), 2000);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    // FASTIFY WS: Clean up on unmount by closing the WebSocket connection
    return () => {
      newSocket.close();
    };
  }, []);

  const handleSend = (messageText) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const message = {
      message: messageText,
      sentTime: new Date().toLocaleTimeString(),
      sender: "You",
      direction: "outgoing",
      position: "single"
    };
    // FASTIFY WS: Send the message using native WebSocket
    socket.send(JSON.stringify({ event: 'message', data: message }));
  };

  const toggleSidebar = () => {
    setSidebarHidden((prev) => !prev);
  };

  return (
    <MainContainer className={`main-container ${sidebarHidden ? 'sidebar-hidden' : ''}`}>
      <Sidebar className={`sidebar ${sidebarHidden ? 'hidden' : ''}`} position="left">
        <ExpansionPanel open title="History">
          <p>Lorem ipsum</p>
          <p>Lorem ipsum</p>
        </ExpansionPanel>
        <ExpansionPanel title="Preferences">
          <p>Lorem ipsum</p>
          <p>Lorem ipsum</p>
        </ExpansionPanel>
      </Sidebar>

      {/* Toggle button placed outside the sidebar */}
      <button className="toggle-button" onClick={toggleSidebar}>
        {/* {sidebarHidden ? 'Show' : 'Hide'} */}
      </button>

      <ChatContainer className="chat-container">
        <ConversationHeader>
          <Avatar src={stitch} name="ai assistant" />
          <ConversationHeader.Content userName="ai assistant" />
          <ConversationHeader.Actions>
            <SendButton border />
          </ConversationHeader.Actions>
        </ConversationHeader>

        <MessageList typingIndicator={typing && <TypingIndicator content="ai Assistant is typing" />}>
          <MessageSeparator content="Saturday, 30 November 2019" />
          <Message model={{
            message: "Hello my friend",
            sentTime: "15 mins ago",
            sender: "ai assistant",
            direction: "incoming",
            position: "single"
          }}>
            <Avatar src={stitch} name="ai assistant" />
          </Message>
          {/* Additional messages */}
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
