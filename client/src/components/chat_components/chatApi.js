// chatApi.js
class ChatAPI {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
  }

  // For GCP cookie-based auth, we don't need Authorization headers
  // The cookies are automatically sent with credentials: 'include'
  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      // No Authorization header needed - cookies handle this
    };
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

  // Chat API methods
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