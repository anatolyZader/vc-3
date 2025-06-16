// ChatContext.jsx
/* eslint-disable no-unused-vars */
import PropTypes from 'prop-types';
import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { AuthContext } from '../auth_components/AuthContext'; 
import chatAPI from './chatApi';

const ChatContext = createContext();

// Chat reducer for state management (same as before)
const chatReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };
    
    case 'SET_CURRENT_CONVERSATION':
      return { ...state, currentConversationId: action.payload };
    
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    
    case 'ADD_MESSAGE':
      return { 
        ...state, 
        messages: [...state.messages, action.payload] 
      };
    
    case 'SET_TYPING':
      return { ...state, isTyping: action.payload };
    
    case 'ADD_CONVERSATION':
      return { 
        ...state, 
        conversations: [action.payload, ...state.conversations] 
      };
    
    case 'UPDATE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.map(conv =>
          conv.id === action.payload.id ? { ...conv, ...action.payload } : conv
        )
      };
    
    case 'DELETE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.filter(conv => conv.id !== action.payload),
        currentConversationId: state.currentConversationId === action.payload ? null : state.currentConversationId,
        messages: state.currentConversationId === action.payload ? [] : state.messages
      };
    
    default:
      return state;
  }
};

const initialState = {
  conversations: [],
  currentConversationId: null,
  messages: [],
  loading: false,
  error: null,
  isTyping: false
};

export const ChatProvider = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  


  // Get auth context to check authentication status
  const { isAuthenticated, userProfile, authLoading } = useContext(AuthContext);

  // Helper function to handle errors
  const handleError = useCallback((error, customMessage) => {
    console.error(customMessage || 'Chat error:', error);
    
    // Handle authentication errors
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      dispatch({ type: 'SET_ERROR', payload: 'Session expired. Please log in again.' });
      // The chatAPI will handle redirect to login
      return;
    }
    
    dispatch({ type: 'SET_ERROR', payload: error.message || 'An error occurred' });
    dispatch({ type: 'SET_LOADING', payload: false });
  }, []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      console.log('Setting up WebSocket connection for real-time chat updates...');
      
      const ws = chatAPI.connectWebSocket();
      
      const handleMessage = (message) => {
        console.log('Received WebSocket message:', message);
        
        switch (message.type) {
          case 'new_message':
            if (message.conversationId === state.currentConversationId) {
              const formattedMessage = {
                message: message.message.content,
                sentTime: new Date(message.message.created_at).toLocaleTimeString(),
                sender: message.message.role === 'user' ? 'You' : 'AI Assistant',
                direction: message.message.role === 'user' ? 'outgoing' : 'incoming',
                position: 'single'
              };
              dispatch({ type: 'ADD_MESSAGE', payload: formattedMessage });
              dispatch({ type: 'SET_TYPING', payload: false });
              console.log('Added real-time message to conversation');
            }
            break;
          case 'error':
            handleError(new Error(message.error), message.error);
            dispatch({ type: 'SET_TYPING', payload: false });
            break;
          default:
            console.log('Unknown WebSocket message type:', message.type);
        }
      };

      const unsubscribe = chatAPI.onMessage(handleMessage);

      return () => {
        console.log('Cleaning up WebSocket connection...');
        unsubscribe();
        chatAPI.disconnect();
      };
    }
  }, [isAuthenticated, authLoading, state.currentConversationId, handleError]);

  // Clear error function
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // Load conversation history
  const loadConversationsHistory = useCallback(async () => {
    if (!isAuthenticated || authLoading) {
      console.log('Not authenticated or still loading auth, skipping conversation load');
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const conversations = await chatAPI.fetchConversationsHistory();
      dispatch({ type: 'SET_CONVERSATIONS', payload: conversations });
    } catch (error) {
      handleError(error, 'Failed to load conversations history');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [isAuthenticated, authLoading, handleError]);

  // Start new conversation
  const startNewConversation = useCallback(async (title = 'New Chat') => {
    if (!isAuthenticated) {
      handleError(new Error('Not authenticated'), 'Please log in to start a conversation');
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const response = await chatAPI.startConversation(title);
      const newConversation = {
        id: response.conversationId,
        title,
        created_at: new Date().toISOString()
      };
      
      dispatch({ type: 'ADD_CONVERSATION', payload: newConversation });
      dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: response.conversationId });
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      
      return response.conversationId;
    } catch (error) {
      handleError(error, 'Failed to start new conversation');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [isAuthenticated, handleError]);

  // Load specific conversation
  const loadConversation = useCallback(async (conversationId) => {
    if (!conversationId || !isAuthenticated) return;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const messages = await chatAPI.fetchConversation(conversationId);
      const formattedMessages = messages.map(msg => ({
        message: msg.content,
        sentTime: new Date(msg.created_at).toLocaleTimeString(),
        sender: msg.role === 'user' ? 'You' : 'AI Assistant',
        direction: msg.role === 'user' ? 'outgoing' : 'incoming',
        position: 'single'
      }));
      
      dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: conversationId });
      dispatch({ type: 'SET_MESSAGES', payload: formattedMessages });
    } catch (error) {
      handleError(error, 'Failed to load conversation');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [isAuthenticated, handleError]);

  // Send message - Updated to work with WebSocket
  const sendMessage = useCallback(async (messageText) => {
    if (!state.currentConversationId || !messageText.trim() || !isAuthenticated) return;
    
    // Add user message immediately to UI
    const userMessage = {
      message: messageText,
      sentTime: new Date().toLocaleTimeString(),
      sender: 'You',
      direction: 'outgoing',
      position: 'single'
    };
    
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    dispatch({ type: 'SET_TYPING', payload: true });
    
    try {
      // Send question to backend - AI response will come via WebSocket
      await chatAPI.sendQuestion(state.currentConversationId, messageText);
      console.log('Message sent, waiting for AI response via WebSocket...');
      
      // Remove the setTimeout simulation since we're using WebSocket now
      // The AI response will be handled by the WebSocket message handler above
      
    } catch (error) {
      dispatch({ type: 'SET_TYPING', payload: false });
      handleError(error, 'Failed to send message');
    }
  }, [state.currentConversationId, isAuthenticated, handleError]);

  // Rename conversation
  const renameConversation = useCallback(async (conversationId, newTitle) => {
    if (!isAuthenticated) return;
    
    try {
      await chatAPI.renameConversation(conversationId, newTitle);
      dispatch({ 
        type: 'UPDATE_CONVERSATION', 
        payload: { id: conversationId, title: newTitle } 
      });
    } catch (error) {
      handleError(error, 'Failed to rename conversation');
    }
  }, [isAuthenticated, handleError]);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId) => {
    if (!isAuthenticated) return;
    
    try {
      await chatAPI.deleteConversation(conversationId);
      dispatch({ type: 'DELETE_CONVERSATION', payload: conversationId });
    } catch (error) {
      handleError(error, 'Failed to delete conversation');
    }
  }, [isAuthenticated, handleError]);

  const value = {
    ...state,
    loadConversationsHistory,
    startNewConversation,
    loadConversation,
    sendMessage,
    renameConversation,
    deleteConversation,
    clearError,
    // Add auth state for convenience
    isAuthenticated,
    userProfile
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

ChatProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};