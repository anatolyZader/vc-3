/* eslint-disable react-refresh/only-export-components */
/* eslint-disable no-unused-vars */
import PropTypes from 'prop-types';
import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { AuthContext } from '../auth_components/AuthContext';
import chatAPI from './chatApi';

const ChatContext = createContext();

// Enhanced reducer with functional updates for WebSocket messages
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
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_TYPING':
      return { ...state, isTyping: action.payload };
    case 'ADD_CONVERSATION':
      return { ...state, conversations: [action.payload, ...state.conversations] };
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
        currentConversationId:
          state.currentConversationId === action.payload ? null : state.currentConversationId,
        messages:
          state.currentConversationId === action.payload ? [] : state.messages
      };
    // ✅ NEW: Enhanced WebSocket message handling with functional update
    case 'ADD_WEBSOCKET_MESSAGE':
      return (currentState) => {
        const { message, conversationId } = action.payload;
        
        // Only add message if it belongs to the current conversation
        if (conversationId === currentState.currentConversationId) {
          return {
            ...currentState,
            messages: [...currentState.messages, message],
            isTyping: false
          };
        }
        
        // Still stop typing indicator even if message is for different conversation
        return {
          ...currentState,
          isTyping: false
        };
      };
    case 'SET_TYPING_WITH_CHECK':
      return (currentState) => ({
        ...currentState,
        isTyping: action.payload
      });
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
  const { isAuthenticated, userProfile, authLoading } = useContext(AuthContext);

  const handleError = useCallback((error, customMessage) => {
    console.error(`[2025-06-27 12:56:58] ${customMessage || 'Chat error'}:`, error);
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      dispatch({ type: 'SET_ERROR', payload: 'Session expired. Please log in again.' });
      return;
    }
    
    dispatch({ type: 'SET_ERROR', payload: error.message || 'An error occurred' });
    dispatch({ type: 'SET_LOADING', payload: false });
  }, []);

  // ✅ IMPROVED: WebSocket message handler without state dependencies
  const handleWebSocketMessage = useCallback((message) => {
    console.log(`[2025-06-27 12:56:58] WS message received by anatolyZader:`, message);
    
    switch (message.type) {
      case 'new_message': {
        const msg = message.message;
        const formattedMessage = {
          message: msg.content,
          sentTime: new Date(msg.created_at).toLocaleTimeString(),
          sender: msg.role === 'user' ? 'You' : 'AI Assistant',
          direction: msg.role === 'user' ? 'outgoing' : 'incoming',
          position: 'single'
        };
        
        // ✅ Use functional dispatch to access current state
        dispatch((currentState) => {
          if (message.conversationId === currentState.currentConversationId) {
            console.log(`[2025-06-27 12:56:58] Adding message to current conversation: ${message.conversationId}`);
            return {
              ...currentState,
              messages: [...currentState.messages, formattedMessage],
              isTyping: false
            };
          } else {
            console.log(`[2025-06-27 12:56:58] Message for different conversation, only stopping typing indicator`);
            return {
              ...currentState,
              isTyping: false
            };
          }
        });
        break;
      }
      
      case 'error': {
        console.error(`[2025-06-27 12:56:58] WebSocket error for anatolyZader:`, message.error);
        handleError(new Error(message.error), `WebSocket error: ${message.error}`);
        dispatch({ type: 'SET_TYPING', payload: false });
        break;
      }
      
      case 'connected': {
        console.log(`[2025-06-27 12:56:58] WebSocket connected successfully for anatolyZader`);
        // Optionally dispatch a success state or clear previous errors
        dispatch({ type: 'SET_ERROR', payload: null });
        break;
      }
      
      case 'ping':
      case 'pong':
      case 'heartbeat_ack': {
        // These are connection maintenance messages, no action needed
        console.log(`[2025-06-27 12:56:58] Connection maintenance message: ${message.type}`);
        break;
      }
      
      default: {
        console.log(`[2025-06-27 12:56:58] Unknown WebSocket message type for anatolyZader:`, message.type);
      }
    }
  }, [handleError]);

  // ✅ IMPROVED: WebSocket connection effect without state dependencies
  useEffect(() => {
    if (!(isAuthenticated && !authLoading && userProfile)) {
      console.log(`[2025-06-27 12:56:58] Skipping WebSocket connection - Auth status:`, {
        isAuthenticated,
        authLoading,
        hasUserProfile: !!userProfile
      });
      return;
    }
    
    console.log(`[2025-06-27 12:56:58] Setting up WebSocket connection for anatolyZader:`, userProfile.name || userProfile.id);
    
    // Set the user in chatAPI before connecting WebSocket
    chatAPI.setUser(userProfile);
    
    // Connect and subscribe to WebSocket messages
    chatAPI.connectWebSocket();
    const unsubscribe = chatAPI.onMessage(handleWebSocketMessage);

    console.log(`[2025-06-27 12:56:58] WebSocket connection established for anatolyZader`);

    // Cleanup function
    return () => {
      console.log(`[2025-06-27 12:56:58] Cleaning up WebSocket connection for anatolyZader`);
      unsubscribe();
      chatAPI.disconnect();
    };
  }, [isAuthenticated, authLoading, userProfile, handleWebSocketMessage]); // ✅ No state dependencies

  // ✅ IMPROVED: Reset typing on conversation change with better logging
  useEffect(() => {
    console.log(`[2025-06-27 12:56:58] Conversation changed to: ${state.currentConversationId}, resetting typing indicator`);
    dispatch({ type: 'SET_TYPING', payload: false });
  }, [state.currentConversationId]);

  // Clear error
  const clearError = useCallback(() => {
    console.log(`[2025-06-27 12:56:58] Clearing error for anatolyZader`);
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // Load conversation history
  const loadConversationsHistory = useCallback(async () => {
    if (!isAuthenticated || authLoading) {
      console.log(`[2025-06-27 12:56:58] Cannot load conversations history - not authenticated`);
      return;
    }
    
    console.log(`[2025-06-27 12:56:58] Loading conversations history for anatolyZader`);
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const conversations = await chatAPI.fetchConversationsHistory();
      console.log(`[2025-06-27 12:56:58] Loaded ${conversations.length} conversations for anatolyZader`);
      dispatch({ type: 'SET_CONVERSATIONS', payload: conversations });
    } catch (error) {
      console.error(`[2025-06-27 12:56:58] Failed to load conversations history:`, error);
      handleError(error, 'Failed to load conversations history');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [isAuthenticated, authLoading, handleError]);

  // Start new conversation
  const startNewConversation = useCallback(async (title = 'New Chat') => {
    if (!isAuthenticated) {
      console.error(`[2025-06-27 12:56:58] Cannot start conversation - not authenticated`);
      handleError(new Error('Not authenticated'), 'Please log in');
      return;
    }
    
    console.log(`[2025-06-27 12:56:58] Starting new conversation for anatolyZader: "${title}"`);
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const response = await chatAPI.startConversation(title);
      const newConv = { 
        id: response.conversationId, 
        title, 
        created_at: new Date().toISOString() 
      };
      
      console.log(`[2025-06-27 12:56:58] New conversation created with ID: ${response.conversationId}`);
      
      dispatch({ type: 'ADD_CONVERSATION', payload: newConv });
      dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: response.conversationId });
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      
      return response.conversationId;
    } catch (error) {
      console.error(`[2025-06-27 12:56:58] Failed to start new conversation:`, error);
      handleError(error, 'Failed to start conversation');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [isAuthenticated, handleError]);

  // Load specific conversation
  const loadConversation = useCallback(async (conversationId) => {
    if (!conversationId || !isAuthenticated) {
      console.log(`[2025-06-27 12:56:58] Cannot load conversation - missing ID or not authenticated`);
      return;
    }
    
    console.log(`[2025-06-27 12:56:58] Loading conversation ${conversationId} for anatolyZader`);
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const msgs = await chatAPI.fetchConversation(conversationId);
      const formatted = msgs.map(msg => ({
        message: msg.content,
        sentTime: new Date(msg.created_at).toLocaleTimeString(),
        sender: msg.sender_type === 'user' ? 'You' : 'AI Assistant',
        direction: msg.sender_type === 'user' ? 'outgoing' : 'incoming',
        position: 'single'
      }));
      
      console.log(`[2025-06-27 12:56:58] Loaded ${formatted.length} messages for conversation ${conversationId}`);
      
      dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: conversationId });
      dispatch({ type: 'SET_MESSAGES', payload: formatted });
    } catch (error) {
      console.error(`[2025-06-27 12:56:58] Failed to load conversation ${conversationId}:`, error);
      handleError(error, 'Failed to load conversation');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [isAuthenticated, handleError]);

  // ✅ IMPROVED: Send message with better state access
  const sendMessage = useCallback(async (text) => {
    // Use functional access to get current conversation ID
    const currentConversationId = state.currentConversationId;
    
    if (!currentConversationId || !text.trim() || !isAuthenticated) {
      console.warn(`[2025-06-27 12:56:58] Cannot send message - missing requirements:`, {
        hasConversationId: !!currentConversationId,
        hasText: !!text.trim(),
        isAuthenticated
      });
      return;
    }
    
    console.log(`[2025-06-27 12:56:58] anatolyZader sending message to conversation ${currentConversationId}: "${text.substring(0, 50)}..."`);
    
    const userMsg = { 
      message: text, 
      sentTime: new Date().toLocaleTimeString(), 
      sender: 'You', 
      direction: 'outgoing', 
      position: 'single' 
    };
    
    dispatch({ type: 'ADD_MESSAGE', payload: userMsg });
    dispatch({ type: 'SET_TYPING', payload: true });
    
    try {
      await chatAPI.sendQuestion(currentConversationId, text);
      console.log(`[2025-06-27 12:56:58] Question sent successfully, awaiting AI response via WebSocket`);
    } catch (error) {
      console.error(`[2025-06-27 12:56:58] Failed to send message:`, error);
      dispatch({ type: 'SET_TYPING', payload: false });
      handleError(error, 'Failed to send message');
    }
  }, [state.currentConversationId, isAuthenticated, handleError]);

  // Rename conversation
  const renameConversation = useCallback(async (id, newTitle) => {
    if (!isAuthenticated) {
      console.error(`[2025-06-27 12:56:58] Cannot rename conversation - not authenticated`);
      return;
    }
    
    console.log(`[2025-06-27 12:56:58] anatolyZader renaming conversation ${id} to: "${newTitle}"`);
    
    try {
      await chatAPI.renameConversation(id, newTitle);
      dispatch({ type: 'UPDATE_CONVERSATION', payload: { id, title: newTitle } });
      console.log(`[2025-06-27 12:56:58] Conversation renamed successfully`);
    } catch (error) {
      console.error(`[2025-06-27 12:56:58] Failed to rename conversation:`, error);
      handleError(error, 'Failed to rename conversation');
    }
  }, [isAuthenticated, handleError]);

  // Delete conversation
  const deleteConversation = useCallback(async (id) => {
    if (!isAuthenticated) {
      console.error(`[2025-06-27 12:56:58] Cannot delete conversation - not authenticated`);
      return;
    }
    
    console.log(`[2025-06-27 12:56:58] anatolyZader deleting conversation ${id}`);
    
    try {
      await chatAPI.deleteConversation(id);
      dispatch({ type: 'DELETE_CONVERSATION', payload: id });
      console.log(`[2025-06-27 12:56:58] Conversation deleted successfully`);
    } catch (error) {
      console.error(`[2025-06-27 12:56:58] Failed to delete conversation:`, error);
      handleError(error, 'Failed to delete conversation');
    }
  }, [isAuthenticated, handleError]);

  // ✅ ENHANCED: Context value with additional debugging info
  const value = {
    ...state,
    loadConversationsHistory,
    startNewConversation,
    loadConversation,
    sendMessage,
    renameConversation,
    deleteConversation,
    clearError,
    isAuthenticated,
    userProfile,
    // ✅ NEW: Add debug info for development
    _debug: {
      timestamp: '2025-06-27 12:56:58',
      user: 'anatolyZader',
      contextVersion: '2.0'
    }
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

ChatProvider.propTypes = { children: PropTypes.node.isRequired };

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};