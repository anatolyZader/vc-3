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
} from '@chatscope/chat-ui-kit-react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import '../../custom-overrides.css';
import './chat.css';
import './voiceInput.css';
import './messageRenderer.css';
import { useEffect, useState, useContext, useRef, useCallback } from 'react';
import { AuthContext } from '../auth_components/AuthContext';
import { useChat } from './ChatContext';
import NewConversationBtn from './NewConversationBtn';
import LogoutBtn from './LogoutBtn'; 
import VoiceInput from './VoiceInput';
import CustomMessage from './CustomMessage';
import ConfirmationDialog from './ConfirmationDialog';
import { scrollChatToBottom } from './scrollUtils';
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
    truncateMessages,
    clearError
  } = useChat();

  const [sidebarWidth, setSidebarWidth] = useState(320); // initial width in px
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    conversationId: null,
    conversationTitle: '',
    loading: false
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
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

  // Mobile detection and responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile && isMobileMenuOpen) {
        // Close mobile menu when switching to mobile view
        setIsMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobileMenuOpen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      console.log('Messages changed, triggering scroll. Message count:', messages.length);
      // Small delay to ensure message is rendered
      const timer = setTimeout(() => {
        console.log('Executing scrollChatToBottom after delay');
        scrollChatToBottom(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

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
    
    // Find conversation details for the confirmation dialog
    const conversation = conversations.find(conv => (conv.id || conv.conversationId) === conversationId);
    const conversationTitle = conversation?.title || 'Untitled Conversation';
    
    // Open the stylish confirmation dialog
    setConfirmDialog({
      open: true,
      conversationId,
      conversationTitle,
      loading: false
    });
  };

  const handleConfirmDelete = async () => {
    const { conversationId } = confirmDialog;
    
    setConfirmDialog(prev => ({ ...prev, loading: true }));
    
    try {
      console.log(`🗑️ User confirmed deletion of conversation: ${conversationId}`);
      await deleteConversation(conversationId);
      
      // Close the dialog
      setConfirmDialog({
        open: false,
        conversationId: null,
        conversationTitle: '',
        loading: false
      });
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      // Error will be handled by the context and shown in the error banner
      setConfirmDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleCancelDelete = () => {
    console.log(`❌ User cancelled deletion of conversation: ${confirmDialog.conversationId}`);
    setConfirmDialog({
      open: false,
      conversationId: null,
      conversationTitle: '',
      loading: false
    });
  };

  const handleEditMessage = async (messageModel, newContent) => {
    try {
      // Find the message index in the current messages array
      const messageIndex = messages.findIndex(msg => 
        msg.message === messageModel.message && 
        msg.sentTime === messageModel.sentTime &&
        msg.direction === messageModel.direction
      );

      if (messageIndex === -1) {
        console.error('Message not found for editing');
        return;
      }

      console.log(`🔧 Editing message at index ${messageIndex}: "${newContent}"`);
      console.log(`🔧 Current messages length: ${messages.length}, truncating from index ${messageIndex}`);
      
      // First truncate all messages from the edited message index onwards
      // This removes the original message and all subsequent messages
      truncateMessages(messageIndex);

      // Then send the edited message to get AI response
      await sendMessage(newContent);

    } catch (error) {
      console.error('Failed to edit message:', error);
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
      style={{ gridTemplateColumns: isMobile ? '1fr' : `${sidebarWidth}px ${HANDLE_WIDTH}px 1fr` }}
    >
      {/* Mobile Header */}
      {isMobile && (
        <div className="mobile-header">
          <button
            className="mobile-menu-button"
            onClick={toggleMobileMenu}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <span className="mobile-header-title">Chat</span>
        </div>
      )}

      {/* Sidebar with mobile overlay */}
      <Sidebar
        className={`sidebar ${isMobile && isMobileMenuOpen ? 'mobile-open' : ''}`}
        position="left"
        style={{ width: isMobile ? '280px' : sidebarWidth }}
      >
        <div className="sidebar-content">
          {isMobile && (
            <div className="mobile-sidebar-header">
              <span>Menu</span>
              <button
                className="mobile-close-button"
                onClick={closeMobileMenu}
                aria-label="Close sidebar"
              >
                ×
              </button>
            </div>
          )}

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

      {/* Resize handle - only show on desktop */}
      {!isMobile && (
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
      )}

      {/* Mobile overlay */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="mobile-overlay" 
          onClick={closeMobileMenu}
        />
      )}

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={clearError}>×</button>
        </div>
      )}

      <MainContainer 
        className="chat-container"
        onClick={isMobile ? closeMobileMenu : undefined}
      >
        <ConversationHeader>
          <Avatar src={eventstorm_logo} name="AI Assistant" />
          <ConversationHeader.Content userName="AI Assistant" />
          <ConversationHeader.Actions>
            {/* Temporary test button for scrolling */}
            <button 
              onClick={() => {
                console.log('Test scroll button clicked');
                scrollChatToBottom(true);
              }}
              style={{ 
                padding: '4px 8px', 
                marginRight: '8px', 
                fontSize: '12px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Test Scroll
            </button>
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
            <CustomMessage 
              key={index} 
              model={message}
              onEditMessage={handleEditMessage}
            >
              {message.direction === 'incoming' && (
                <Avatar src={eventstorm_logo} name="AI Assistant" />
              )}
            </CustomMessage>
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

      {/* Confirmation Dialog for deleting conversations */}
      <ConfirmationDialog
        open={confirmDialog.open}
        title="Delete Conversation"
        description={`Are you sure you want to delete "${confirmDialog.conversationTitle}"? This action cannot be undone.`}
        loading={confirmDialog.loading}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
};

export default Chat;
