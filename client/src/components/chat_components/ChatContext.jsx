// chatContext.jsx
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable no-unused-vars */
import PropTypes from 'prop-types';
import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react'; // useReducer manages complex state transitions.
         // useRef holds mutable values (current conversation) without triggering renders.
         // useCallback memoizes handlers to avoid unnecessary re‑subscriptions.
import { AuthContext } from '../auth_components/AuthContext';
import chatAPI from './chatApi';

const ChatContext = createContext();

//  reducer in React (via the useReducer hook) is simply a pure function that takes your previous state and an action, and returns the next state: const nextState = reducer(prevState, action).
// Action types (strings like 'ADD_MESSAGE') describe what happened.
// Payloads carry any needed data (action.payload).
// Each case returns a new state object, copying (...state) and then replacing only the affected slice.
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
      // This will now be used for both user and AI messages after formatting
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
    case 'TRUNCATE_MESSAGES':
      // Remove all messages after and including the specified index
      return {
        ...state,
        messages: state.messages.slice(0, action.payload.index)
      };
    case 'EDIT_MESSAGE':
      // Replace a message at a specific index and truncate subsequent messages
      return {
        ...state,
        messages: [
          ...state.messages.slice(0, action.payload.index),
          action.payload.message
        ]
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

  // Use a ref to store the currentConversationId to avoid stale closures in handleWebSocketMessage
  const currentConversationIdRef = useRef(state.currentConversationId);

  // Track current and previous conversation IDs
  const lastConversationIdRef = useRef(null);
  useEffect(() => {
    currentConversationIdRef.current = state.currentConversationId;
  }, [state.currentConversationId]);

  // Track which conversations have already been named to avoid duplicate calls
  const namedConversationsRef = useRef(new Set());

  // Helper function to name a conversation reliably
  const nameConversationSafely = useCallback(async (conversationId, options = {}) => {
    if (!conversationId || !isAuthenticated || namedConversationsRef.current.has(conversationId)) {
      return;
    }
    
    namedConversationsRef.current.add(conversationId);
    
    try {
      const result = await chatAPI.nameConversation(conversationId, options);
      if (result && typeof result.title === 'string') {
        dispatch({ type: 'UPDATE_CONVERSATION', payload: { id: conversationId, title: result.title } });
      }
      return result;
    } catch (err) {
      console.warn('Failed to auto-name conversation:', err?.message || err);
      namedConversationsRef.current.delete(conversationId);
      throw err;
    }
  }, [isAuthenticated]);

  const handleError = useCallback((error, customMessage) => {
    console.error(`[${new Date().toISOString()}] ${customMessage || 'Chat error'}:`, error);
    
    if (error.message && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
      dispatch({ type: 'SET_ERROR', payload: 'Session expired. Please log in again.' });
      return;
    }
    
    dispatch({ type: 'SET_ERROR', payload: error.message || 'An error occurred' });
    dispatch({ type: 'SET_LOADING', payload: false });
  }, []);

  // ✅ CORRECTED: WebSocket message handler to dispatch existing actions
  const handleWebSocketMessage = useCallback((message) => {
    console.log(`[${new Date().toISOString()}] WS message received by anatolyZader:`, message);
    
    switch (message.type) {
      case 'new_message': {
        const msg = message.message;
        const conversationId = message.conversationId; // Get conversationId from the WS message
        const formattedMessage = {
          message: msg.content,
          sentTime: new Date(msg.created_at).toLocaleTimeString(),
          sender: msg.role === 'user' ? 'You' : 'AI Assistant',
          direction: msg.role === 'user' ? 'outgoing' : 'incoming',
          position: 'single',
          isFromHistory: false // This is a real-time message, should be animated
        };
        
        // Use the ref to get the most current conversation ID
        if (conversationId === currentConversationIdRef.current) {
            console.log(`[${new Date().toISOString()}] Adding message to current conversation: ${conversationId}`);
            dispatch({ type: 'ADD_MESSAGE', payload: formattedMessage });
        } else {
            console.log(`[${new Date().toISOString()}] Message for different conversation (${conversationId}), current is ${currentConversationIdRef.current}. Not adding to chat.`);
        }
        // Always stop typing indicator when a new message (especially AI) is received
        dispatch({ type: 'SET_TYPING', payload: false });
        break;
      }
      
      case 'error': {
        console.error(`[${new Date().toISOString()}] WebSocket error for anatolyZader:`, message.error);
        handleError(new Error(message.error), `WebSocket error: ${message.error}`);
        dispatch({ type: 'SET_TYPING', payload: false });
        break;
      }
      
      case 'connected': {
        console.log(`[${new Date().toISOString()}] WebSocket connected successfully for anatolyZader`);
        dispatch({ type: 'SET_ERROR', payload: null });
        break;
      }
      
      case 'ping':
      case 'pong':
      case 'heartbeat_ack': {
        console.log(`[${new Date().toISOString()}] Connection maintenance message: ${message.type}`);
        break;
      }
      
      default: {
        console.log(`[${new Date().toISOString()}] Unknown WebSocket message type for anatolyZader:`, message.type);
      }
    }
  }, [handleError]); // No longer depends on state.currentConversationId because we use the ref

  // ✅ ADJUSTED: WebSocket connection effect. Ensure chatAPI.connectWebSocket is called only once after auth is ready.
  // The goal is to avoid the cleanup/reconnect race condition.
  useEffect(() => {
    if (!isAuthenticated || authLoading || !userProfile) {
      console.log(`[${new Date().toISOString()}] Skipping WebSocket connection - Auth status:`, {
        isAuthenticated,
        authLoading,
        hasUserProfile: !!userProfile
      });
      // Ensure WebSocket is disconnected if authentication state changes to unauthenticated
      if (chatAPI.isConnected()) {
        chatAPI.disconnect();
      }
      return;
    }
    
    // Only connect if not already connected. This prevents the immediate reconnect.
    if (!chatAPI.isConnected()) {
      console.log(`[${new Date().toISOString()}] Setting up WebSocket connection for anatolyZader:`, userProfile.name || userProfile.id);
      
      chatAPI.setUser(userProfile);
      
      chatAPI.connectWebSocket();
      const unsubscribe = chatAPI.onMessage(handleWebSocketMessage);

      console.log(`[${new Date().toISOString()}] WebSocket connection established for anatolyZader`);

      // Cleanup function only runs when the component unmounts or dependencies change (rarely for this effect)
      return () => {
        console.log(`[${new Date().toISOString()}] Cleaning up WebSocket connection for anatolyZader`);
        unsubscribe();
        chatAPI.disconnect();
      };
    }
    // No cleanup return if already connected, so it doesn't disconnect prematurely.
  }, [isAuthenticated, authLoading, userProfile, handleWebSocketMessage]); 


  useEffect(() => {
    console.log(`[${new Date().toISOString()}] Conversation changed to: ${state.currentConversationId}, resetting typing indicator`);
    dispatch({ type: 'SET_TYPING', payload: false });
  }, [state.currentConversationId]);

  const clearError = useCallback(() => {
    console.log(`[${new Date().toISOString()}] Clearing error for anatolyZader`);
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const loadConversationsHistory = useCallback(async () => {
    if (!isAuthenticated || authLoading) {
      console.log(`[${new Date().toISOString()}] Cannot load conversations history - not authenticated`);
      return;
    }
    
    console.log(`[${new Date().toISOString()}] Loading conversations history for anatolyZader`);
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const conversations = await chatAPI.fetchConversationsHistory();
      // Normalize server conversation objects to a consistent shape expected by UI
      const normalized = (conversations || []).map(c => ({
        id: c.id || c.conversationId, // backend returns conversationId, newly created we already store id
        title: c.title || 'Untitled Conversation',
        created_at: c.created_at || c.createdAt, // historical mix of snake / camel
        updated_at: c.updated_at || c.updatedAt
      })).filter(c => !!c.id); // drop any malformed entries

      console.log(`[${new Date().toISOString()}] Loaded ${normalized.length} conversations (normalized) for anatolyZader`);
      dispatch({ type: 'SET_CONVERSATIONS', payload: normalized });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to load conversations history:`, error);
      handleError(error, 'Failed to load conversations history');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [isAuthenticated, authLoading, handleError]);

  const startNewConversation = useCallback(async (title = 'New Chat') => {
    if (!isAuthenticated) {
      console.error(`[${new Date().toISOString()}] Cannot start conversation - not authenticated`);
      handleError(new Error('Not authenticated'), 'Please log in');
      return;
    }
    
    console.log(`[${new Date().toISOString()}] Starting new conversation for anatolyZader: "${title}"`);
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const response = await chatAPI.startConversation(title);
      const newConv = { 
        id: response.conversationId, 
        title, 
        created_at: new Date().toISOString() 
      };
      
      console.log(`[${new Date().toISOString()}] New conversation created with ID: ${response.conversationId}`);
      
      dispatch({ type: 'ADD_CONVERSATION', payload: newConv });
      dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: response.conversationId });
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      
      return response.conversationId;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to start new conversation:`, error);
      handleError(error, 'Failed to start conversation');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [isAuthenticated, handleError]);

  const loadConversation = useCallback(async (conversationId) => {
    if (!conversationId || !isAuthenticated) {
      console.log(`[${new Date().toISOString()}] Cannot load conversation - missing ID or not authenticated`);
      return;
    }
    
    console.log(`[${new Date().toISOString()}] Loading conversation ${conversationId} for anatolyZader`);
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const conversation = await chatAPI.fetchConversation(conversationId);
      // Some older API responses may wrap data differently (aggregate instance). Normalize.
      const rawMessages = conversation.messages || (conversation.data && conversation.data.messages) || [];
      const formatted = rawMessages.map(msg => ({
        message: msg.content || msg.text || msg.message || '',
        sentTime: new Date(msg.created_at || msg.timestamp || Date.now()).toLocaleTimeString(),
        sender: (msg.role === 'user' ? 'You' : 'AI Assistant'),
        direction: (msg.role === 'user' ? 'outgoing' : 'incoming'),
        position: 'single',
        isFromHistory: true // Flag to indicate this message is loaded from history, not real-time
      }));
      
      console.log(`[${new Date().toISOString()}] Loaded ${formatted.length} messages for conversation ${conversationId}`);
      
      dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: conversationId });
      dispatch({ type: 'SET_MESSAGES', payload: formatted });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to load conversation ${conversationId}:`, error);
      handleError(error, 'Failed to load conversation');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [isAuthenticated, handleError]);

  // Auto-name the previous conversation when switching to a new one
  useEffect(() => {
    const prevId = lastConversationIdRef.current;
    const nextId = state.currentConversationId;
    // Name the conversation we are leaving
    if (prevId && prevId !== nextId && isAuthenticated && !namedConversationsRef.current.has(prevId)) {
      nameConversationSafely(prevId).catch(() => {
        // Error already logged in helper function
      });
    }
    // Update last seen to the current after handling
    lastConversationIdRef.current = nextId;
  }, [state.currentConversationId, isAuthenticated, nameConversationSafely]);

  // Auto-name the current conversation on page unload/close
  useEffect(() => {
    const handler = () => {
      const cid = currentConversationIdRef.current;
      if (cid && !namedConversationsRef.current.has(cid)) {
        namedConversationsRef.current.add(cid);
        // Use keepalive to maximize success during unload
        try { 
          chatAPI.nameConversation(cid, { keepalive: true }); 
        } catch (err) {
          console.warn('Failed to name conversation on unload:', err?.message || err);
        }
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const sendMessage = useCallback(async (text) => {
    // Use the ref to get the current conversation ID
    const currentConversationId = currentConversationIdRef.current;
    
    if (!currentConversationId || !text.trim() || !isAuthenticated) {
      console.warn(`[${new Date().toISOString()}] Cannot send message - missing requirements:`, {
        hasConversationId: !!currentConversationId,
        hasText: !!text.trim(),
        isAuthenticated
      });
      return;
    }
    
    console.log(`[${new Date().toISOString()}] anatolyZader sending message to conversation ${currentConversationId}: "${text.substring(0, 50)}..."`);
    
    const userMsg = { 
      message: text, 
      sentTime: new Date().toLocaleTimeString(), 
      sender: 'You', 
      direction: 'outgoing', 
      position: 'single',
      isFromHistory: false // User messages are always real-time
    };
    
    dispatch({ type: 'ADD_MESSAGE', payload: userMsg });
    dispatch({ type: 'SET_TYPING', payload: true });
    
    try {
      await chatAPI.sendQuestion(currentConversationId, text);
      console.log(`[${new Date().toISOString()}] Question sent successfully, awaiting AI response via WebSocket`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to send message:`, error);
      dispatch({ type: 'SET_TYPING', payload: false });
      handleError(error, 'Failed to send message');
    }
  }, [isAuthenticated, handleError]); // Now doesn't directly depend on state.currentConversationId

  // Voice message functionality
  const sendVoiceMessage = useCallback(async (audioBlob) => {
    const currentConversationId = currentConversationIdRef.current;
    
    if (!currentConversationId || !audioBlob || !isAuthenticated) {
      console.warn(`[${new Date().toISOString()}] Cannot send voice message - missing requirements:`, {
        hasConversationId: !!currentConversationId,
        hasAudioBlob: !!audioBlob,
        isAuthenticated
      });
      throw new Error('Missing requirements for voice message');
    }
    
    console.log(`[${new Date().toISOString()}] anatolyZader processing voice message for conversation ${currentConversationId}`);
    
    try {
      // Send voice message directly to the voice endpoint
      const voiceResult = await chatAPI.sendVoiceQuestion(currentConversationId, audioBlob);
      
      if (!voiceResult.success || !voiceResult.transcript) {
        throw new Error('Could not understand the audio. Please try speaking more clearly.');
      }

      const transcript = voiceResult.transcript.trim();
      
      console.log(`[${new Date().toISOString()}] Voice transcribed and processed: "${transcript}"`);
      
      // Add the question message to local state (the response will come via WebSocket)
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          role: 'user',
          text: transcript,
          timestamp: new Date().toISOString()
        }
      });
      
      return {
        success: true,
        transcript,
        confidence: voiceResult.confidence || 0,
        questionId: voiceResult.questionId
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to process voice message:`, error);
      throw error;
    }
  }, [isAuthenticated, sendMessage]);

  const renameConversation = useCallback(async (id, newTitle) => {
    if (!isAuthenticated) {
      console.error(`[${new Date().toISOString()}] Cannot rename conversation - not authenticated`);
      return;
    }
    
    console.log(`[${new Date().toISOString()}] anatolyZader renaming conversation ${id} to: "${newTitle}"`);
    
    try {
      await chatAPI.renameConversation(id, newTitle);
      dispatch({ type: 'UPDATE_CONVERSATION', payload: { id, title: newTitle } });
      console.log(`[${new Date().toISOString()}] Conversation renamed successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to rename conversation:`, error);
      handleError(error, 'Failed to rename conversation');
    }
  }, [isAuthenticated, handleError]);

  const deleteConversation = useCallback(async (id) => {
    if (!isAuthenticated) {
      console.error(`[${new Date().toISOString()}] Cannot delete conversation - not authenticated`);
      handleError(new Error('Not authenticated'), 'Please log in');
      return;
    }
    
    console.log(`[${new Date().toISOString()}] anatolyZader deleting conversation ${id}`);
    dispatch({ type: 'SET_ERROR', payload: null }); // Clear any previous errors
    
    try {
      await chatAPI.deleteConversation(id);
      dispatch({ type: 'DELETE_CONVERSATION', payload: id });
      console.log(`[${new Date().toISOString()}] Conversation ${id} deleted successfully`);
      
      // If the deleted conversation was the current one, show a message
      if (state.currentConversationId === id) {
        console.log(`[${new Date().toISOString()}] Deleted conversation was active, clearing chat area`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to delete conversation ${id}:`, error);
      handleError(error, 'Failed to delete conversation');
    }
  }, [isAuthenticated, handleError, state.currentConversationId]);

  const truncateMessages = useCallback((fromIndex) => {
    dispatch({ type: 'TRUNCATE_MESSAGES', payload: { index: fromIndex } });
    console.log(`🔧 Truncated messages from index ${fromIndex}`);
  }, []);

  // Cleanup: Name current conversation when component unmounts
  useEffect(() => {
    return () => {
      const cid = currentConversationIdRef.current;
      if (cid && !namedConversationsRef.current.has(cid)) {
        namedConversationsRef.current.add(cid);
        // Use keepalive for cleanup scenarios
        try { 
          chatAPI.nameConversation(cid, { keepalive: true }); 
        } catch (err) {
          console.warn('Failed to name conversation on unmount:', err?.message || err);
        }
      }
    };
  }, []);

  // Auto-name conversations after a period of inactivity (when they have messages)
  useEffect(() => {
    const cid = state.currentConversationId;
    const hasMessages = state.messages.length > 0;
    
    if (!cid || !hasMessages || !isAuthenticated || namedConversationsRef.current.has(cid)) {
      return;
    }
    
    // Wait 30 seconds after last message before auto-naming
    const timeoutId = setTimeout(() => {
      nameConversationSafely(cid).catch(() => {
        // Error already logged in helper function
      });
    }, 30000); // 30 seconds
    
    return () => clearTimeout(timeoutId);
  }, [state.currentConversationId, state.messages.length, isAuthenticated, nameConversationSafely]);

  const value = {
    ...state,
    loadConversationsHistory,
    startNewConversation,
    loadConversation,
    sendMessage,
    sendVoiceMessage,
    renameConversation,
    deleteConversation,
    truncateMessages,
    clearError,
    isAuthenticated,
    userProfile,
    _debug: {
      timestamp: new Date().toISOString(),
      user: 'anatolyZader',
      contextVersion: '2.3' // Updated version with voice support
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