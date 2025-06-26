// Update your existing chatApi.js with WebSocket methods
class ChatAPI {
  constructor(baseURL = '') {
    this.baseURL = baseURL || window.location.origin;
    this.websocket = null;
    this.messageHandlers = new Set();
  }

  // For GCP cookie-based auth, we don't need Authorization headers
  // The cookies are automatically sent with credentials: 'include'
  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      // No Authorization header needed - cookies handle this
    };
  }

  connectWebSocket() {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      return this.websocket;
    }

      // 🛑 Add reconnection limits
    if (!this.reconnectAttempts) this.reconnectAttempts = 0;
    if (this.reconnectAttempts >= 5) {
      console.log('❌ Max reconnection attempts reached. WebSocket disabled.');
      return null;
    }

    // 🔧 Connect directly to backend server (bypass Vite proxy for WebSocket)
    const isDevelopment = window.location.hostname === 'localhost';

    // 🔧 Add userId as query parameter
    const wsUrl = isDevelopment 
      ? 'ws://localhost:3000/api/ws?userId=anatolyZader'  // Add userId
      : `wss://${window.location.host}/api/ws?userId=anatolyZader`;
    
    console.log(`Connecting to WebSocket (attempt ${this.reconnectAttempts + 1}):`, wsUrl);
    this.websocket = new WebSocket(wsUrl);
    
     
    this.websocket.onopen = () => {
      console.log('WebSocket connected successfully');
      this.reconnectAttempts = 0; // Reset on successful connection

    };
    
    this.websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received WebSocket message:', message);
        this.messageHandlers.forEach(handler => handler(message));
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.websocket.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      // Only reconnect if not intentional and under limit
      if (event.code !== 1000 && this.reconnectAttempts < 5) {
        this.reconnectAttempts++;
        setTimeout(() => {
          console.log(`Attempting to reconnect WebSocket... (${this.reconnectAttempts}/5)`);
          this.connectWebSocket();
        }, 3000 * this.reconnectAttempts); // Exponential backoff
      }
    };
    
    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return this.websocket;
  }

  // Add message handler
  onMessage(handler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.websocket) {
      this.websocket.close(1000, 'Normal closure');
      this.websocket = null;
    }
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      credentials: 'include', // CRITICAL: This sends cookies with every request
      ...options
    };

    console.log(`Making API call to: ${url}`);

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        // Handle authentication errors specifically
        if (response.status === 401) {
          // Cookie expired or invalid - redirect to login
          window.location.href = '/api/auth/google';
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error);
      throw error;
    }
  }

  // Chat API methods (keep all your existing methods)
  async fetchConversationsHistory() {
    console.log('Calling fetchConversationsHistory API...');
    return this.makeRequest('/api/chat/history', {
      method: 'GET'
    });
  }

  async startConversation(title = 'New Chat') {
    return this.makeRequest('/api/chat/start', {
      method: 'POST',
      body: JSON.stringify({ title })
    });
  }

  async fetchConversation(conversationId) {
    return this.makeRequest(`/api/chat/${conversationId}`, {
      method: 'GET'
    });
  }

  async sendQuestion(conversationId, prompt) {
    return this.makeRequest(`/api/chat/${conversationId}/question`, {
      method: 'POST',
      body: JSON.stringify({ prompt })
    });
  }

  async sendAnswer(conversationId, aiResponse) {
    return this.makeRequest(`/api/chat/${conversationId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ aiResponse })
    });
  }

  async renameConversation(conversationId, newTitle) {
    return this.makeRequest(`/api/chat/${conversationId}/rename`, {
      method: 'PATCH',
      body: JSON.stringify({ newTitle })
    });
  }

  async deleteConversation(conversationId) {
    return this.makeRequest(`/api/chat/${conversationId}`, {
      method: 'DELETE'
    });
  }
}

export default new ChatAPI();