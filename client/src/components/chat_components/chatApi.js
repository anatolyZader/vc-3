// chatApi.js

class ChatAPI {
  constructor(baseURL = '') {
    this.baseURL = baseURL || window.location.origin;
    this.websocket = null;
    this.messageHandlers = new Set();
    this.currentUser = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.connectionState = 'disconnected'; // disconnected, connecting, connected
  }

  // Add this method to check connection status directly
  isConnected() {
    return this.connectionState === 'connected' && this.websocket && this.websocket.readyState === WebSocket.OPEN;
  }

  // Add method to set current user
  setUser(user) {
    console.log(`[2025-06-30 11:42:00] Setting user for chatAPI:`, user?.id || 'undefined');
    this.currentUser = user;
  }

  // For GCP cookie-based auth, we don't need Authorization headers
  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      // No Authorization header needed - cookies handle this
    };
  }

  connectWebSocket() {
    // Prevent multiple connection attempts
    if (this.connectionState === 'connecting') {
      console.log('🔄 WebSocket connection already in progress');
      return this.websocket;
    }

    if (this.isConnected()) { // Use the new isConnected method here
      console.log('✅ WebSocket already connected');
      return this.websocket;
    }

    // Check reconnection limits
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Max reconnection attempts reached. WebSocket disabled.');
      return null;
    }

    // Validate user is available
    if (!this.currentUser?.id) {
      console.log('❌ No user available for WebSocket connection');
      return null;
    }

    this.connectionState = 'connecting';

    // Clear any existing reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Determine WebSocket URL
    const isDevelopment = window.location.hostname === 'localhost';
    const wsUrl = isDevelopment
      ? `ws://localhost:3000/api/ws?userId=${this.currentUser.id}`
      : `wss://${window.location.host}/api/ws?userId=${this.currentUser.id}`;

    console.log(`[2025-06-30 11:42:00] Connecting to WebSocket (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}):`, wsUrl);

    try {
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('✅ WebSocket connected successfully for user:', this.currentUser.id);
        this.connectionState = 'connected';
        this.reconnectAttempts = 0; // Reset on successful connection

        // Send connection confirmation
        this.messageHandlers.forEach(handler => handler({
          type: 'connected',
          userId: this.currentUser.id,
          timestamp: new Date().toISOString()
        }));
      };

      this.websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log(`[2025-06-30 11:42:00] Received WebSocket message for ${this.currentUser.id}:`, message);
          this.messageHandlers.forEach(handler => handler(message));
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
          console.error('Raw message data:', event.data);
        }
      };

      this.websocket.onclose = (event) => {
        console.log(`🔌 WebSocket disconnected for ${this.currentUser.id}:`, {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });

        this.connectionState = 'disconnected';

        // Only attempt reconnection for unexpected closures
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else if (event.code !== 1000) {
          console.log('❌ Max reconnection attempts reached, giving up');
          this.messageHandlers.forEach(handler => handler({
            type: 'error',
            message: 'WebSocket connection failed after maximum attempts'
          }));
        }
      };

      this.websocket.onerror = (error) => {
        console.error(`❌ WebSocket error for ${this.currentUser.id}:`, error);
        this.connectionState = 'disconnected';

        // Notify handlers of the error
        this.messageHandlers.forEach(handler => handler({
          type: 'error',
          message: 'WebSocket connection error',
          error: error
        }));
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      this.connectionState = 'disconnected';
      return null;
    }

    return this.websocket;
  }

  scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = Math.min(3000 * this.reconnectAttempts, 30000); // Cap at 30 seconds

    console.log(`🔄 Scheduling WebSocket reconnection in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      console.log(`🔄 Attempting to reconnect WebSocket... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connectWebSocket();
    }, delay);
  }

  // Add message handler
  onMessage(handler) {
    this.messageHandlers.add(handler);
    console.log(`📝 Added WebSocket message handler. Total handlers: ${this.messageHandlers.size}`);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(handler);
      console.log(`📝 Removed WebSocket message handler. Total handlers: ${this.messageHandlers.size}`);
    };
  }

  // Disconnect WebSocket
  disconnect() {
    console.log(`🔌 Disconnecting WebSocket for ${this.currentUser?.id || 'unknown user'}`);

    // Clear reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Close WebSocket connection
    if (this.websocket) {
      this.websocket.close(1000, 'Normal closure');
      this.websocket = null;
    }

    // Reset state
    this.connectionState = 'disconnected';
    this.reconnectAttempts = 0;
  }

  // Get connection status
  getConnectionStatus() {
    return {
      state: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      hasUser: !!this.currentUser?.id,
      userId: this.currentUser?.id,
      websocketState: this.websocket?.readyState
    };
  }

  // Send message through WebSocket (useful for ping/pong)
  sendWebSocketMessage(message) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      try {
        this.websocket.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('❌ Failed to send WebSocket message:', error);
        return false;
      }
    } else {
      console.warn('⚠️ Cannot send WebSocket message - connection not open');
      return false;
    }
  }

  // Enhanced makeRequest with better error handling
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      credentials: 'include', // CRITICAL: This sends cookies with every request
      ...options
    };

    console.log(`[2025-06-30 11:42:00] Making API call to: ${url}`);

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        // Handle authentication errors specifically
        if (response.status === 401) {
          console.log('🔐 Authentication required - redirecting to login');
          // Cookie expired or invalid - redirect to login
          window.location.href = '/api/auth/google';
          return;
        }

        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error(`❌ API Error for ${endpoint}:`, errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log(`✅ API call successful for ${endpoint}`);
      return data;
    } catch (error) {
      console.error(`❌ API Error for ${endpoint}:`, error);
      throw error;
    }
  }

  // Chat API methods (enhanced with better logging)
  async fetchConversationsHistory() {
    console.log(`[2025-06-30 11:42:00] Fetching conversations history for ${this.currentUser?.id || 'unknown user'}`);
    return this.makeRequest('/api/chat/history', {
      method: 'GET'
    });
  }

  async startConversation(title = 'New Chat') {
    console.log(`[2025-06-30 11:42:00] Starting new conversation: "${title}" for ${this.currentUser?.id || 'unknown user'}`);
    return this.makeRequest('/api/chat/start', {
      method: 'POST',
      body: JSON.stringify({ title })
    });
  }

  async fetchConversation(conversationId) {
    console.log(`[2025-06-30 11:42:00] Fetching conversation ${conversationId} for ${this.currentUser?.id || 'unknown user'}`);
    return this.makeRequest(`/api/chat/${conversationId}`, {
      method: 'GET'
    });
  }

  async sendQuestion(conversationId, prompt) {
    console.log(`[2025-06-30 11:42:00] Sending question to conversation ${conversationId}: "${prompt.substring(0, 50)}..." for ${this.currentUser?.id || 'unknown user'}`);
    return this.makeRequest(`/api/chat/${conversationId}/question`, {
      method: 'POST',
      body: JSON.stringify({ prompt })
    });
  }

  async sendAnswer(conversationId, aiResponse) {
    console.log(`[2025-06-30 11:42:00] Sending AI answer to conversation ${conversationId} for ${this.currentUser?.id || 'unknown user'}`);
    return this.makeRequest(`/api/chat/${conversationId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ aiResponse })
    });
  }

  async renameConversation(conversationId, newTitle) {
    console.log(`[2025-06-30 11:42:00] Renaming conversation ${conversationId} to "${newTitle}" for ${this.currentUser?.id || 'unknown user'}`);
    return this.makeRequest(`/api/chat/${conversationId}/rename`, {
      method: 'PATCH',
      body: JSON.stringify({ newTitle })
    });
  }

  async deleteConversation(conversationId) {
    console.log(`[2025-06-30 11:42:00] Deleting conversation ${conversationId} for ${this.currentUser?.id || 'unknown user'}`);
    return this.makeRequest(`/api/chat/${conversationId}`, {
      method: 'DELETE'
    });
  }

  // Name conversation via AI (server will compute from first 3 user prompts)
  async nameConversation(conversationId, { keepalive = false } = {}) {
    const endpoint = '/api/chat/name-conversation';
    const url = `${this.baseURL}${endpoint}`;
    const payload = JSON.stringify({ conversationId });
    console.log(`[2025-06-30 11:42:00] Naming conversation ${conversationId} (keepalive=${keepalive})`);

    // Try beacon for unload scenarios
    if (keepalive && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        const ok = navigator.sendBeacon(url, blob);
        return ok ? { conversationId, title: undefined, status: 'queued' } : null;
      } catch (e) {
        console.warn('sendBeacon failed, falling back to fetch keepalive:', e?.message || e);
      }
    }

    // Fallback to fetch (supports keepalive)
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: payload,
      keepalive
    });
  }
}

export default new ChatAPI();