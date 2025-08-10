// Chat.jsx 

import React, { useEffect, useState, useContext } from 'react';
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
import { AuthContext } from '../auth_components/AuthContext';
import { useChat } from './ChatContext';
import NewConversationBtn from './NewConversationBtn';
import LogoutBtn from './LogoutBtn'; 
import eventstorm_logo from './eventstorm_logo.png';  

const Chat = () => {
  const { isAuthenticated, userProfile, authLoading } = useContext(AuthContext);
  // Destructures both data (lists, flags) and actions / methods.
  // Encourages a clear separation: view layer doesn’t know fetch details. 
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
  }, [isAuthenticated, authLoading, loadConversationsHistory]); // re‑fire if the user logs out and back in, or if you swap out your loader function (e.g. hot‑reload, context change

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
      const conversationId = await startNewConversation(`convers No.`);
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
    event.stopPropagation(); // Prevents the click from bubbling up to parent handlers (for instance, the container’s onClick that opens the conversation). Without it, deleting could also trigger “open conversation” logic.
    // TODO: replace window.confirm with a custom modal!!!
    // 4. Modern best practice: a custom modal
      // Non‑blocking (async)
      // Styled to match your theme
      // Accessible (ARIA, focus management)
      // Extensible (add extra info, custom buttons)
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

  const handleVoiceChat = () => {
    try {
      console.log('[VoiceChat] Attempt start');
      if (!navigator.mediaDevices?.getUserMedia) {
        console.warn('getUserMedia not supported');
        return;
      }
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          console.log('[VoiceChat] Microphone stream acquired', stream.getAudioTracks()[0]?.label);
          // Placeholder: stop immediately to avoid dangling permission
          stream.getTracks().forEach(t => t.stop());
        })
        .catch(err => console.error('[VoiceChat] Mic error', err));
    } catch (e) {
      console.error('[VoiceChat] Unexpected error', e);
    }
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

      <div className="chat-container-wrapper" style={{ 
        gridArea: 'chat-container',
        display: 'flex', 
        flexDirection: 'column',
        height: '100%'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '15px 20px', 
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <img src={eventstorm_logo} alt="AI Assistant" style={{ width: 32, height: 32, borderRadius: '50%' }} />
          <h3 style={{ margin: 0, color: '#333', fontSize: '18px' }}>AI Assistant</h3>
          <div style={{ marginLeft: 'auto' }}>
            <LogoutBtn />
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={clearError}>×</button>
          </div>
        )}

        {/* Message area */}
        <div style={{ 
          flex: 1, 
          padding: '20px', 
          overflow: 'auto',
          backgroundColor: '#ffffff'
        }}>
          {/* If no conversation selected */}
          {!currentConversationId && (
            <div style={{ 
              textAlign: 'center', 
              color: '#495057', 
              padding: '60px 30px',
              maxWidth: '500px',
              margin: '0 auto'
            }}>
              <div style={{ fontSize: '28px', marginBottom: '16px' }}>💬</div>
              <p style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                marginBottom: '12px',
                lineHeight: '1.4'
              }}>
                Welcome to EventStorm Chat!
              </p>
              <p style={{ 
                fontSize: '16px', 
                lineHeight: '1.6',
                color: '#6c757d'
              }}>
                Select a conversation from the sidebar or start a new one to begin chatting with your AI assistant.
              </p>
            </div>
          )}

          {/* If conversation selected but no messages yet */}
          {currentConversationId && messages.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              color: '#495057', 
              padding: '60px 30px',
              maxWidth: '500px',
              margin: '0 auto'
            }}>
              <div style={{ fontSize: '28px', marginBottom: '16px' }}>🚀</div>
              <p style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                marginBottom: '12px',
                lineHeight: '1.4'
              }}>
                New conversation started
              </p>
              <p style={{ 
                fontSize: '16px', 
                lineHeight: '1.6',
                color: '#6c757d'
              }}>
                Send your first message below to begin chatting with the AI assistant.
              </p>
            </div>
          )}

          {/* Messages */}
          {currentConversationId && messages.map((message, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: message.direction === 'outgoing' ? 'flex-end' : 'flex-start',
              marginBottom: '16px'
            }}>
              <div style={{
                maxWidth: '75%',
                minWidth: '120px'
              }}>
                {/* Message bubble */}
                <div style={{
                  padding: '16px 20px',
                  backgroundColor: message.direction === 'outgoing' ? '#007bff' : '#f1f3f5',
                  color: message.direction === 'outgoing' ? '#ffffff' : '#2c3e50',
                  borderRadius: message.direction === 'outgoing' 
                    ? '20px 20px 4px 20px' 
                    : '20px 20px 20px 4px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  position: 'relative'
                }}>
                  <div style={{ 
                    fontSize: '16px', 
                    lineHeight: '1.6',
                    wordWrap: 'break-word',
                    whiteSpace: 'pre-wrap' 
                  }}>
                    {message.message}
                  </div>
                </div>
                
                {/* Message info */}
                <div style={{ 
                  fontSize: '13px', 
                  color: '#6c757d',
                  marginTop: '6px',
                  textAlign: message.direction === 'outgoing' ? 'right' : 'left',
                  paddingLeft: message.direction === 'outgoing' ? '0' : '8px',
                  paddingRight: message.direction === 'outgoing' ? '8px' : '0'
                }}>
                  {message.sender} • {message.sentTime}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-start',
              marginBottom: '16px'
            }}>
              <div style={{
                padding: '16px 20px',
                backgroundColor: '#f1f3f5',
                borderRadius: '20px 20px 20px 4px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                color: '#6c757d',
                fontStyle: 'italic',
                fontSize: '15px',
                lineHeight: '1.5'
              }}>
                <span style={{ opacity: 0.7 }}>🤔</span> AI Assistant is typing...
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        {currentConversationId && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'stretch', 
            gap: '12px', 
            padding: '16px 20px',
            borderTop: '1px solid #e0e0e0',
            backgroundColor: '#f8f9fa'
          }}>
            <input 
              type="text"
              placeholder="Type your message here..."
              style={{ 
                flex: 1,
                padding: '14px 18px',
                border: '2px solid #e9ecef',
                borderRadius: '25px',
                fontSize: '16px',
                lineHeight: '1.5',
                outline: 'none',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#007bff';
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 123, 255, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e9ecef';
                e.target.style.boxShadow = 'none';
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  handleSend(e.target.value);
                  e.target.value = '';
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                const input = document.querySelector('input[type="text"]');
                if (input && input.value.trim()) {
                  handleSend(input.value);
                  input.value = '';
                }
              }}
              style={{
                padding: '14px 24px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0, 123, 255, 0.3)'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#0056b3';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#007bff';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 8px rgba(0, 123, 255, 0.3)';
              }}
            >
              Send
            </button>
            <button
              type="button"
              onClick={handleVoiceChat}
              title="Start voice chat"
              aria-label="Start voice chat"
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: '1px solid #ddd',
                background: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#f0f0f0';
                  e.target.style.transform = 'scale(1.05)';
                }
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#fff';
                e.target.style.transform = 'scale(1)';
              }}
              disabled={loading}
            >
              🎤
            </button>
          </div>
        )}
      </div>
    </MainContainer>
  );
};

export default Chat;