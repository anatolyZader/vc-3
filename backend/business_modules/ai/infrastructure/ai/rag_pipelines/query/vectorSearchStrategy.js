const TextMatcher = require('./textMatcher');

/**
 * Intelligent vector search strategy selector
 * Analyzes prompts to determine optimal search parameters
 */
class VectorSearchStrategy {
  /**
   * Determine intelligent search strategy based on prompt analysis
   */
  static determineSearchStrategy(prompt) {
    const promptLower = prompt.toLowerCase();
    
    // Domain/business logic questions
    if (TextMatcher.containsKeywords(promptLower, ['domain', 'entity', 'business', 'rule', 'aggregate', 'model'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Domain/Business Logic Query`);
      return {
        codeResults: 15,
        docsResults: 8,
        codeFilters: { type: 'github-file' },
        docsFilters: { type: 'module_documentation' }
      };
    }
    
    // API/endpoint questions
    if (TextMatcher.containsKeywords(promptLower, ['api', 'endpoint', 'route', 'http', 'request', 'controller', 'fastify'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: API/Endpoint Query`);
      return {
        codeResults: 20,        // Increased from 12 to 20
        docsResults: 10,        // Increased from 8 to 10
        codeFilters: { type: 'github-file' }, // Match actual content type
        docsFilters: { type: 'apiSpec' } // Match API spec docs
      };
    }
    
    // Error/debugging questions
    if (TextMatcher.containsKeywords(promptLower, ['error', 'bug', 'fix', 'debug', 'issue', 'problem', 'exception', 'fail'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Error/Debugging Query`);
      return {
        codeResults: 20,
        docsResults: 5,
        codeFilters: { type: 'github-file' }, // Match actual content type
        docsFilters: {}
      };
    }
    
    // Chat/conversation questions
    if (TextMatcher.containsKeywords(promptLower, ['chat', 'message', 'conversation', 'websocket', 'socket'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Chat Module Query`);
      return {
        codeResults: 15,
        docsResults: 5,
        codeFilters: { type: 'github-file' },
        docsFilters: { type: 'module_documentation' }
      };
    }
    
    // Git/repository questions
    if (TextMatcher.containsKeywords(promptLower, ['git', 'repository', 'github', 'pull request', 'commit', 'branch'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Git Module Query`);
      return {
        codeResults: 15,
        docsResults: 5,
        codeFilters: { type: 'github-file' },
        docsFilters: { type: 'module_documentation' }
      };
    }
    
    // AI/RAG/embedding questions
    if (TextMatcher.containsKeywords(promptLower, ['ai', 'embedding', 'vector', 'rag', 'langchain', 'openai', 'semantic'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: AI Module Query`);
      return {
        codeResults: 15,
        docsResults: 8,
        codeFilters: { type: 'github-file' },
        docsFilters: { type: 'module_documentation' }
      };
    }
    
    // Docs/documentation questions
    if (TextMatcher.containsKeywords(promptLower, ['docs', 'documentation', 'search', 'knowledge', 'doc'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Docs Module Query`);
      return {
        codeResults: 12,
        docsResults: 10,
        codeFilters: { eventstorm_module: 'docsModule' },
        docsFilters: { type: 'module_documentation' }
      };
    }
    
    // Test/testing questions
    if (TextMatcher.containsKeywords(promptLower, ['test', 'testing', 'spec', 'unit test', 'integration test'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Testing Query`);
      return {
        codeResults: 15,
        docsResults: 5,
        codeFilters: { semantic_role: 'test' },
        docsFilters: {}
      };
    }
    
    // Configuration/setup questions
    if (TextMatcher.containsKeywords(promptLower, ['config', 'configuration', 'setup', 'environment', 'env', 'settings'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Configuration Query`);
      return {
        codeResults: 10,
        docsResults: 12,
        codeFilters: { semantic_role: 'config' },
        docsFilters: { type: 'configuration' }
      };
    }
    
    // Plugin/middleware questions
    if (TextMatcher.containsKeywords(promptLower, ['plugin', 'middleware', 'interceptor', 'fastify plugin'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Plugin/Middleware Query`);
      return {
        codeResults: 15,
        docsResults: 8,
        codeFilters: { semantic_role: 'plugin' },
        docsFilters: {}
      };
    }
    
    // Default strategy for general questions
    console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: General Query (default)`);
    return {
      codeResults: 20,        // Increased from 15 to 20
      docsResults: 10,        // Increased from 8 to 10
      codeFilters: {},
      docsFilters: {}
    };
  }
}

module.exports = VectorSearchStrategy;
