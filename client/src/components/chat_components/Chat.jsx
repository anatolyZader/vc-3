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
import { cleanChatText } from './textSanitizer';
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
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState([]);

  // Debug logging for mobile menu state - temporarily disabled
  // useEffect(() => {
  //   console.log('Mobile menu state changed:', { isMobile, isMobileMenuOpen });
  // }, [isMobile, isMobileMenuOpen]);
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
      
      // Only update if mobile state actually changed
      if (mobile !== isMobile) {
        setIsMobile(mobile);
        // Only close menu when switching FROM mobile TO desktop
        if (!mobile && isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobile]); // Removed isMobileMenuOpen from dependencies

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to ensure message is rendered
      const timer = setTimeout(() => {
        scrollChatToBottom(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  // Search functionality for conversations
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conversation =>
        (conversation.title || 'Untitled Conversation')
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [conversations, searchQuery]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = (e) => {
    // Only close if the click is not on the sidebar itself
    if (e && e.target.closest('.sidebar')) {
      return;
    }
    setIsMobileMenuOpen(false);
  };

  const handleMainContainerClick = (e) => {
    // Only close the menu if clicking directly on the main container or its children
    // but not if clicking on the sidebar
    if (!e.target.closest('.sidebar') && !e.target.closest('.mobile-header')) {
      setIsMobileMenuOpen(false);
    }
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
    
    // Clean the message text to remove HTML entities and unwanted characters
    const cleanedText = cleanChatText(messageText);
    console.log('Original text:', messageText);
    console.log('Cleaned text:', cleanedText);
    
    sendMessage(cleanedText);
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
      const conversationId = await startNewConversation(`New conversation`);
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
            type="button"
          >
            ☰
          </button>
          <span className="mobile-header-title"></span>
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
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close sidebar"
              >
                ×
              </button>
            </div>
          )}

          {/* Only show New Conversation button in sidebar on desktop if there's an active conversation */}
          {!isMobile && currentConversationId && (
            <NewConversationBtn 
              onNewConversation={handleNewConversation}
              disabled={loading}
            />
          )}

          {/* Search in Conversations Section */}
          <ExpansionPanel open={false} title="Search Conversations">
            <div className="search-section">
              <div className="search-input-container">
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="search-input"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="search-clear-btn"
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
              {searchQuery && (
                <div className="search-results">
                  <div className="search-results-header">
                    {filteredConversations.length} result{filteredConversations.length !== 1 ? 's' : ''} found
                  </div>
                  {filteredConversations.map((conversation) => {
                    const convId = conversation.id || conversation.conversationId;
                    const createdAt = conversation.created_at || conversation.createdAt || new Date().toISOString();
                    return (
                      <div
                        key={convId}
                        className={`conversation-item search-result ${
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
                      </div>
                    );
                  })}
                  {filteredConversations.length === 0 && (
                    <div className="no-search-results">
                      No conversations found matching "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </ExpansionPanel>

          <ExpansionPanel open={false} title="Conversations">
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

          {/* Account/Logout clickable item */}
          <div className="account-item" onClick={() => setIsAccountModalOpen(true)}>
            <div className="account-item-content">
              <div className="account-item-title">Account</div>
            </div>
            <div className="account-item-arrow">›</div>
          </div>
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
          onClick={() => setIsMobileMenuOpen(false)}
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
        onClick={isMobile ? handleMainContainerClick : undefined}
      >
        <ConversationHeader>
          <Avatar src={eventstorm_logo} name="AI Assistant" />
          <ConversationHeader.Content userName="AI Assistant" />
        </ConversationHeader>

        <MessageList 
          typingIndicator={isTyping ? (
            <TypingIndicator content="AI Assistant is typing..." />
          ) : undefined}
        >
          {/* New Conversation Button in center - show when no active conversation */}
          {!currentConversationId && (
            <div className={isMobile ? "mobile-new-conversation-container" : "desktop-new-conversation-container"}>
              <div className={isMobile ? "mobile-new-conversation-content" : "desktop-new-conversation-content"}>
                <NewConversationBtn 
                  onNewConversation={handleNewConversation}
                  disabled={loading}
                />
              </div>
            </div>
          )}

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

      {/* Account Modal */}
      {isAccountModalOpen && (
        <>
          <div className="modal-overlay" onClick={() => setIsAccountModalOpen(false)} />
          <div className="account-modal">
            <div className="account-modal-header">
              <h3>Account Settings</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setIsAccountModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="account-modal-content">
              <div className="account-info">
                <p><strong>User:</strong> {userProfile?.name || 'anatolyZader'}</p>
                <p><strong>Email:</strong> {userProfile?.email || 'Not available'}</p>
              </div>
              <div className="account-actions">
                <LogoutBtn />
              </div>
            </div>
          </div>
        </>
      )}

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
