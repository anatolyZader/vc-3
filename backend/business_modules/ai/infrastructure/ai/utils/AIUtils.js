/**
 * Utility functions for AI operations
 */
class AIUtils {
  /**
   * Format API spec summary
   */
  static formatApiSpecSummary(apiSpec) {
    if (!apiSpec) return '';
    let summary = 'API Endpoints and Tags from OpenAPI spec:';
    
    // List tags
    if (Array.isArray(apiSpec.tags)) {
      summary += '\n\nTags:';
      apiSpec.tags.forEach(tag => {
        summary += `\n- ${tag.name}: ${tag.description}`;
      });
    }
    
    // List endpoints
    if (apiSpec.paths && typeof apiSpec.paths === 'object') {
      summary += '\n\nEndpoints:';
      Object.entries(apiSpec.paths).forEach(([path, methods]) => {
        Object.entries(methods).forEach(([method, details]) => {
          const tagList = details.tags && details.tags.length ? ` [tags: ${details.tags.join(', ')}]` : '';
          summary += `\n- ${method.toUpperCase()} ${path}${tagList}`;
        });
      });
    }
    return summary;
  }

  /**
   * Determine file type from extension
   */
  static getFileType(filePath) {
    const extension = filePath.split('.').pop().toLowerCase();
    const codeExtensions = {
      js: 'JavaScript',
      jsx: 'React',
      ts: 'TypeScript',
      tsx: 'React TypeScript',
      py: 'Python',
      java: 'Java',
      rb: 'Ruby',
      php: 'PHP',
      c: 'C',
      cpp: 'C++',
      cs: 'C#',
      go: 'Go',
      rs: 'Rust',
      swift: 'Swift',
      kt: 'Kotlin',
      html: 'HTML',
      css: 'CSS',
      scss: 'SCSS',
      json: 'JSON',
      md: 'Markdown',
      sql: 'SQL',
      sh: 'Shell',
      bat: 'Batch',
      ps1: 'PowerShell',
      yaml: 'YAML',
      yml: 'YAML',
      xml: 'XML'
    };

    return codeExtensions[extension] || 'Unknown';
  }

  /**
   * Sanitize document IDs for Pinecone
   */
  static sanitizeId(input) {
    return input.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
  }

  /**
   * Format conversation history for LangChain
   */
  static formatConversationHistory(history) {
    if (!history || history.length === 0) {
      return [];
    }

    const messages = [];
    
    history.forEach((entry) => {
      messages.push({
        role: "user",
        content: entry.prompt
      });
      
      messages.push({
        role: "assistant", 
        content: entry.response
      });
    });

    console.log(`[${new Date().toISOString()}] 🔍 CONVERSATION HISTORY: Formatted ${messages.length} messages (${messages.length / 2} exchanges) for context`);
    return messages;
  }

  /**
   * Check if text contains specific keywords
   */
  static containsKeywords(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * Emit RAG status updates for monitoring
   */
  static emitRagStatus(status, details = {}, eventBus = null) {
    // Always log the status update
    console.log(`[${new Date().toISOString()}] 🔍 RAG STATUS: ${status}`, 
      Object.keys(details).length > 0 ? JSON.stringify(details, null, 2) : '');
    
    // Try to emit to the event bus if available
    try {
      // Use provided event bus
      if (eventBus) {
        eventBus.emit('ragStatusUpdate', {
          component: 'aiUtils',
          timestamp: new Date().toISOString(),
          status,
          ...details
        });
        return;
      }
      
      // Fallback to imported event bus
      const eventDispatcherPath = '../../../../../eventDispatcher';
      const { eventBus: fallbackEventBus } = require(eventDispatcherPath);
      if (fallbackEventBus) {
        fallbackEventBus.emit('ragStatusUpdate', {
          component: 'aiUtils',
          timestamp: new Date().toISOString(),
          status,
          ...details
        });
      }
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Failed to emit RAG status update: ${error.message}`);
    }
  }
}

module.exports = AIUtils;
