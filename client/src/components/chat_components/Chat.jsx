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
} from '@chatscope/chat-ui-kit-react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import '../../custom-overrides.css';
import './chat.css';
import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../auth_components/AuthContext';
import { useChat } from './ChatContext';
import NewConversationBtn from './NewConversationBtn';
import LogoutBtn from './LogoutBtn'; 
import stitch from '../stitch.jpg';

const Chat = () => {
  const { isAuthenticated, userProfile, authLoading } = useContext(AuthContext);
  const {
    conversations,
    currentConversationId,
    messages,
    loading,
    error,
    isTyping,
    loadConversationsHistory,
    startNewConversation,
    loadConversation,
    sendMessage,
    deleteConversation,
    clearError
  } = useChat();

  const [sidebarHidden, setSidebarHidden] = useState(false);

  // Load conversations when authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadConversationsHistory();
    }
  }, [isAuthenticated, authLoading, loadConversationsHistory]);

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (conversations.length > 0 && !currentConversationId) {
      loadConversation(conversations[0].id);
    }
  }, [conversations, currentConversationId, loadConversation]);

  // Show loading spinner while auth is loading
  if (authLoading) {
    return <div>Loading authentication...</div>;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <div>Please log in to access the chat.</div>;
  }

  const handleSend = (messageText) => {
    if (!messageText.trim()) return;
    sendMessage(messageText);
  };

  const handleNewConversation = async () => {
    console.log('Starting new conversation for user:', userProfile?.name || 'anatolyZader');
    try {
      const conversationId = await startNewConversation(`New Chat - ${new Date().toLocaleDateString()}`);
      if (conversationId) {
        console.log('New conversation started with ID:', conversationId);
      }
    } catch (error) {
      console.error('Failed to start new conversation:', error);
    }
  };

  const handleConversationSelect = (conversationId) => {
    if (conversationId !== currentConversationId) {
      loadConversation(conversationId);
    }
  };

  const handleDeleteConversation = async (conversationId, event) => {
    event.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      await deleteConversation(conversationId);
    }
  };

  const toggleSidebar = () => {
    setSidebarHidden((prev) => !prev);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <MainContainer className={`main-container ${sidebarHidden ? 'sidebar-hidden' : ''}`}>
      <Sidebar className={`sidebar ${sidebarHidden ? 'hidden' : ''}`} position="left">
        <div className="sidebar-content">

          <NewConversationBtn 
            onNewConversation={handleNewConversation}
            disabled={loading}
          />

          <ExpansionPanel open title="Conversations">
            <div className="conversations-list">
              {loading && conversations.length === 0 && (
                <p>Loading conversations...</p>
              )}
              
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`conversation-item ${
                    conversation.id === currentConversationId ? 'active' : ''
                  }`}
                  onClick={() => handleConversationSelect(conversation.id)}
                >
                  <div className="conversation-title">
                    {conversation.title || 'Untitled Conversation'}
                  </div>
                  <div className="conversation-date">
                    {formatDate(conversation.created_at)}
                  </div>
                  <button
                    className="delete-conversation"
                    onClick={(e) => handleDeleteConversation(conversation.id, e)}
                    title="Delete conversation"
                  >
                    ×
                  </button>
                </div>
              ))}
              
              {conversations.length === 0 && !loading && (
                <p>No conversations yet</p>
              )}
            </div>
          </ExpansionPanel>
        </div>
      </Sidebar>

      <button className="toggle-button" onClick={toggleSidebar}>
        {/* Toggle icon */}
      </button>

      <ChatContainer className="chat-container">
        <ConversationHeader>
          <Avatar src={stitch} name="AI Assistant" />
          <ConversationHeader.Content userName="AI Assistant" />
          <ConversationHeader.Actions>
            <LogoutBtn /> 
          </ConversationHeader.Actions>
        </ConversationHeader>

        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={clearError}>×</button>
          </div>
        )}

        <MessageList 
          typingIndicator={isTyping && (
            <TypingIndicator content="AI Assistant is typing..." />
          )}
        >
          {!currentConversationId ? (
            <div className="no-conversation">
              <p>Select a conversation or start a new one</p>
            </div>
          ) : (
            <>
              {messages.length > 0 && (
                <MessageSeparator content={formatDate(new Date())} />
              )}
              
              {messages.map((message, index) => (
                <Message key={index} model={message}>
                  {message.direction === 'incoming' && (
                    <Avatar src={stitch} name="AI Assistant" />
                  )}
                </Message>
              ))}
              
              {messages.length === 0 && !loading && (
                <div className="empty-conversation">
                  <p>Start the conversation by sending a message!</p>
                </div>
              )}
            </>
          )}
        </MessageList>

        <MessageInput
          className="message-input"
          placeholder={
            currentConversationId 
              ? "Enter your message here..." 
              : "Start a new conversation first"
          }
          onSend={handleSend}
          disabled={!currentConversationId || loading}
          responsive
        />
      </ChatContainer>
    </MainContainer>
  );
};

export default Chat;