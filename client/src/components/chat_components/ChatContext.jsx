/* eslint-disable no-unused-vars */
import PropTypes from 'prop-types';
import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { AuthContext } from '../auth_components/AuthContext';
import chatAPI from './chatApi';

const ChatContext = createContext();

// Reducer
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
    console.error(customMessage || 'Chat error:', error);
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      dispatch({ type: 'SET_ERROR', payload: 'Session expired. Please log in again.' });
      return;
    }
    dispatch({ type: 'SET_ERROR', payload: error.message || 'An error occurred' });
    dispatch({ type: 'SET_LOADING', payload: false });
  }, []);

  // === Effect A: Open WS once on auth ===
  useEffect(() => {
    if (!(isAuthenticated && !authLoading)) return;
    console.log('Connecting WebSocket for chat...');

    // Connect and subscribe
    chatAPI.connectWebSocket();
    const unsubscribe = chatAPI.onMessage(message => {
      console.log('WS message:', message);
      switch (message.type) {
        case 'new_message': {
          if (message.conversationId === state.currentConversationId) {
            const msg = message.message;
            dispatch({
              type: 'ADD_MESSAGE',
              payload: {
                message: msg.content,
                sentTime: new Date(msg.created_at).toLocaleTimeString(),
                sender: msg.role === 'user' ? 'You' : 'AI Assistant',
                direction: msg.role === 'user' ? 'outgoing' : 'incoming',
                position: 'single'
              }
            });
            dispatch({ type: 'SET_TYPING', payload: false });
          }
          break;
        }
        case 'error':
          handleError(new Error(message.error), message.error);
          dispatch({ type: 'SET_TYPING', payload: false });
          break;
        default:
          console.log('Unknown WS message:', message);
      }
    });

    return () => {
      console.log('Disconnecting WebSocket...');
      unsubscribe();
      chatAPI.disconnect();
    };
  }, [isAuthenticated, authLoading, state.currentConversationId, handleError]);

  // === Effect B: Reset typing on conversation change ===
  useEffect(() => {
    dispatch({ type: 'SET_TYPING', payload: false });
  }, [state.currentConversationId]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // Load conversation history
  const loadConversationsHistory = useCallback(async () => {
    if (!isAuthenticated || authLoading) return;
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
      handleError(new Error('Not authenticated'), 'Please log in');
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const response = await chatAPI.startConversation(title);
      const newConv = { id: response.conversationId, title, created_at: new Date().toISOString() };
      dispatch({ type: 'ADD_CONVERSATION', payload: newConv });
      dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: response.conversationId });
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      return response.conversationId;
    } catch (error) {
      handleError(error, 'Failed to start conversation');
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
      const msgs = await chatAPI.fetchConversation(conversationId);
      const formatted = msgs.map(msg => ({
        message: msg.content,
        sentTime: new Date(msg.created_at).toLocaleTimeString(),
        sender: msg.sender_type === 'user' ? 'You' : 'AI Assistant',
        direction: msg.sender_type === 'user' ? 'outgoing' : 'incoming',
        position: 'single'
      }));
      dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: conversationId });
      dispatch({ type: 'SET_MESSAGES', payload: formatted });
    } catch (error) {
      handleError(error, 'Failed to load conversation');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [isAuthenticated, handleError]);

  // Send message
  const sendMessage = useCallback(async (text) => {
    if (!state.currentConversationId || !text.trim() || !isAuthenticated) return;
    const userMsg = { message: text, sentTime: new Date().toLocaleTimeString(), sender: 'You', direction: 'outgoing', position: 'single' };
    dispatch({ type: 'ADD_MESSAGE', payload: userMsg });
    dispatch({ type: 'SET_TYPING', payload: true });
    try {
      await chatAPI.sendQuestion(state.currentConversationId, text);
      console.log('Sent question, awaiting WS response');
    } catch (error) {
      dispatch({ type: 'SET_TYPING', payload: false });
      handleError(error, 'Failed to send message');
    }
  }, [state.currentConversationId, isAuthenticated, handleError]);

  // Rename conversation
  const renameConversation = useCallback(async (id, newTitle) => {
    if (!isAuthenticated) return;
    try {
      await chatAPI.renameConversation(id, newTitle);
      dispatch({ type: 'UPDATE_CONVERSATION', payload: { id, title: newTitle } });
    } catch (error) {
      handleError(error, 'Failed to rename');
    }
  }, [isAuthenticated, handleError]);

  // Delete conversation
  const deleteConversation = useCallback(async (id) => {
    if (!isAuthenticated) return;
    try {
      await chatAPI.deleteConversation(id);
      dispatch({ type: 'DELETE_CONVERSATION', payload: id });
    } catch (error) {
      handleError(error, 'Failed to delete');
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
    isAuthenticated,
    userProfile
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

ChatProvider.propTypes = { children: PropTypes.node.isRequired };
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};
