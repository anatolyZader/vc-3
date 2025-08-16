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
import './voiceInput.css';
import { useEffect, useState, useContext, useRef, useCallback } from 'react';
import { AuthContext } from '../auth_components/AuthContext';
import { useChat } from './ChatContext';
import NewConversationBtn from './NewConversationBtn';
import LogoutBtn from './LogoutBtn'; 
import VoiceInput from './VoiceInput';
import eventstorm_logo from './eventstorm_logo.png';  

const Chat = () => {
  const { isAuthenticated, userProfile, authLoading } = useContext(AuthContext);
  // Destructures both data (lists, flags) and actions / methods.
  // Encourages a clear separation: view layer doesn't know fetch details. 
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
    sendVoiceMessage,
    deleteConversation,
    clearError
  } = useChat();

  const [sidebarWidth, setSidebarWidth] = useState(320); // initial width in px
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(sidebarWidth);
  const containerLeftRef = useRef(0);
  const containerWidthRef = useRef(0);

  const MIN_WIDTH = 180;
  const MIN_CHAT_WIDTH = 360; // ensure chat area remains usable
  const HANDLE_WIDTH = 6;
  const mainContainerRef = useRef(null);

  // Function to get the main container element
  const getMainContainer = useCallback(() => {
    // Now that we use a div, we can use the ref directly
    return mainContainerRef.current || document.querySelector('.main-container');
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    
    const totalWidth = containerWidthRef.current || 0;
    const containerLeft = containerLeftRef.current || 0;
    
    // Calculate the proposed sidebar width based on mouse position
    let proposed = e.clientX - containerLeft;
    
    // Apply constraints to ensure both sidebar and chat area remain usable
    const maxSidebarWidth = totalWidth - MIN_CHAT_WIDTH - HANDLE_WIDTH;
    const minSidebarWidth = MIN_WIDTH;
    
    // Clamp the proposed width between min and max
    proposed = Math.max(minSidebarWidth, Math.min(proposed, maxSidebarWidth));
    
    setSidebarWidth(proposed);
  }, []);

  const stopDrag = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      document.body.classList.remove('resizing');
    }
  }, []);

  const startDrag = (e) => {
    const mainContainer = getMainContainer();
    if (!mainContainer) return;
    const rect = mainContainer.getBoundingClientRect();
    containerLeftRef.current = rect.left;
    containerWidthRef.current = rect.width;
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
    document.body.classList.add('resizing');
  };

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('mouseleave', stopDrag);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('mouseleave', stopDrag);
    };
  }, [onMouseMove, stopDrag]);

  // Load conversations when authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadConversationsHistory();
    }
  }, [isAuthenticated, authLoading, loadConversationsHistory]);

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

  const handleVoiceMessage = async (audioBlob) => {
    try {
      const result = await sendVoiceMessage(audioBlob);
      console.log('[Voice] Message processed successfully:', result);
      return result;
    } catch (error) {
      console.error('[Voice] Failed to process voice message:', error);
      throw error;
    }
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
    console.log(`🔍 Attempting to select conversation: ${conversationId}`);
    console.log(`🔍 Current conversation ID: ${currentConversationId}`);
    if (conversationId !== currentConversationId) {
      console.log(`🔍 Loading conversation ${conversationId}`);
      loadConversation(conversationId);
    } else {
      console.log(`🔍 Conversation ${conversationId} is already selected`);
    }
  };

  const handleDeleteConversation = async (conversationId, event) => {
    event.stopPropagation(); // Prevents the click from bubbling up to parent handlers
    
    // Enhanced confirmation with conversation title
    const conversation = conversations.find(conv => (conv.id || conv.conversationId) === conversationId);
    const conversationTitle = conversation?.title || 'Untitled Conversation';
    const confirmMessage = `Are you sure you want to delete the conversation "${conversationTitle}"?\n\nThis action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        console.log(`🗑️ User confirmed deletion of conversation: ${conversationId}`);
        await deleteConversation(conversationId);
      } catch (error) {
        console.error('Failed to delete conversation:', error);
        // Error will be handled by the context and shown in the error banner
      }
    } else {
      console.log(`❌ User cancelled deletion of conversation: ${conversationId}`);
    }
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
    <div
      ref={mainContainerRef}
      className="main-container"
      style={{ gridTemplateColumns: `${sidebarWidth}px ${HANDLE_WIDTH}px 1fr` }}
    >
      <Sidebar
        className="sidebar"
        position="left"
        style={{ width: sidebarWidth }}
      >
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
              
              {conversations.map((conversation) => {
                const convId = conversation.id || conversation.conversationId; // support both shapes
                const createdAt = conversation.created_at || conversation.createdAt || new Date().toISOString();
                return (
                  <div
                    key={convId}
                    className={`conversation-item ${
                      convId === currentConversationId ? 'active' : ''
                    }`}
                    onClick={() => handleConversationSelect(convId)}
                  >
                    <div className="conversation-title">
                      {conversation.title || 'Untitled Conversation'}
                    </div>
                    <div className="conversation-date">
                      {formatDate(createdAt)}
                    </div>
                    <button
                      className="delete-conversation"
                      onClick={(e) => handleDeleteConversation(convId, e)}
                      title="Delete conversation"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              
              {conversations.length === 0 && !loading && (
                <p>No conversations yet</p>
              )}
            </div>
          </ExpansionPanel>
        </div>
      </Sidebar>

      <div
        className="resize-handle"
        onMouseDown={startDrag}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize conversations sidebar"
        tabIndex={0}
        onKeyDown={(e) => {
          const mainContainer = getMainContainer();
          if (!mainContainer) return;
          const totalWidth = mainContainer.getBoundingClientRect().width;
          const maxSidebarWidth = totalWidth - MIN_CHAT_WIDTH - HANDLE_WIDTH;
          const minSidebarWidth = MIN_WIDTH;
          
          if (e.key === 'ArrowLeft') {
            setSidebarWidth(w => Math.max(minSidebarWidth, w - 16));
          }
          if (e.key === 'ArrowRight') {
            setSidebarWidth(w => Math.min(maxSidebarWidth, w + 16));
          }
        }}
        onDoubleClick={() => setSidebarWidth(320)}
        title="Drag to resize (double-click to reset)"
      />

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={clearError}>×</button>
        </div>
      )}

      <MainContainer className="chat-container">
        <ConversationHeader>
          <Avatar src={eventstorm_logo} name="AI Assistant" />
          <ConversationHeader.Content userName="AI Assistant" />
          <ConversationHeader.Actions>
            <LogoutBtn /> 
          </ConversationHeader.Actions>
        </ConversationHeader>

        <MessageList 
          typingIndicator={isTyping ? (
            <TypingIndicator content="AI Assistant is typing..." />
          ) : undefined}
        >
          {currentConversationId && messages.length > 0 && (
            <MessageSeparator content={formatDate(new Date())} />
          )}
          
          {currentConversationId && messages.map((message, index) => (
            <Message 
              key={index} 
              model={message}
            >
              {message.direction === 'incoming' && (
                <Avatar src={eventstorm_logo} name="AI Assistant" />
              )}
            </Message>
          ))}
        </MessageList>

        {currentConversationId && (
          <div className="message-input-container">
            <MessageInput
              className="message-input"
              placeholder="Enter your message here..."
              onSend={handleSend}
              disabled={loading}
              responsive='true'
            />
            <VoiceInput
              className="inline"
              onVoiceMessage={handleVoiceMessage}
              disabled={loading || !currentConversationId}
            />
          </div>
        )}
      </MainContainer>
    </div>
  );
};

export default Chat;
