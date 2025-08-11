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
import { useEffect, useState, useContext, useRef, useCallback } from 'react';
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

  const onMouseMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
  const totalWidth = containerWidthRef.current || 0;
    const containerLeft = containerLeftRef.current || 0;
    let proposed = e.clientX - containerLeft; // distance from container left
  const maxWidth = Math.max(MIN_WIDTH, totalWidth - MIN_CHAT_WIDTH - HANDLE_WIDTH);
    if (proposed < MIN_WIDTH) proposed = MIN_WIDTH;
    if (proposed > maxWidth) proposed = maxWidth;
    setSidebarWidth(proposed);
  }, []);

  const stopDrag = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      document.body.classList.remove('resizing');
    }
  }, []);

  const startDrag = (e) => {
    if (!mainContainerRef.current) return;
    const rect = mainContainerRef.current.getBoundingClientRect();
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <MainContainer
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
          if (!mainContainerRef.current) return;
          const totalWidth = mainContainerRef.current.getBoundingClientRect().width;
          const maxWidth = Math.max(MIN_WIDTH, totalWidth - MIN_CHAT_WIDTH - HANDLE_WIDTH);
            if (e.key === 'ArrowLeft') setSidebarWidth(w => Math.max(MIN_WIDTH, w - 16));
            if (e.key === 'ArrowRight') setSidebarWidth(w => Math.min(maxWidth, w + 16));
        }}
        onDoubleClick={() => setSidebarWidth(320)}
        title="Drag to resize (double-click to reset)"
      />

      <ChatContainer className="chat-container">
        <ConversationHeader>
          <Avatar src={eventstorm_logo} name="AI Assistant" />
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
          typingIndicator={isTyping ? (
            <TypingIndicator content="AI Assistant is typing..." />
          ) : undefined}
        >
          {currentConversationId && messages.length > 0 && (
            <MessageSeparator content={formatDate(new Date())} />
          )}
          
          {currentConversationId && messages.map((message, index) => (
            <Message key={index} model={message}>
              {message.direction === 'incoming' && (
                <Avatar src={eventstorm_logo} name="AI Assistant" />
              )}
            </Message>
          ))}
        </MessageList>


        {currentConversationId && (
            <MessageInput
                className="message-input"
                placeholder="Enter your message here..."
                onSend={handleSend}
                disabled={loading}
                responsive='true'
            />
        )}
             

      </ChatContainer>
    </MainContainer>
  );
};

export default Chat;