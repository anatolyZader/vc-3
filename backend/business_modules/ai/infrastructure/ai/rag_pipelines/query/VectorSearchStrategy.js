const AIUtils = require('../../utils/AIUtils');

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
    if (AIUtils.containsKeywords(promptLower, ['domain', 'entity', 'business', 'rule', 'aggregate', 'model'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Domain/Business Logic Query`);
      return {
        userResults: 8,
        coreResults: 3,
        userFilters: { layer: 'domain' },
        coreFilters: { type: 'module_documentation' }
      };
    }
    
    // API/endpoint questions
    if (AIUtils.containsKeywords(promptLower, ['api', 'endpoint', 'route', 'http', 'request', 'controller', 'fastify'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: API/Endpoint Query`);
      return {
        userResults: 6,
        coreResults: 5,
        userFilters: { semantic_role: 'controller' },
        coreFilters: { type: 'api_endpoint' }
      };
    }
    
    // Error/debugging questions
    if (AIUtils.containsKeywords(promptLower, ['error', 'bug', 'fix', 'debug', 'issue', 'problem', 'exception', 'fail'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Error/Debugging Query`);
      return {
        userResults: 10,
        coreResults: 2,
        userFilters: { is_entrypoint: true }, // Focus on entry points where errors often occur
        coreFilters: {}
      };
    }
    
    // Chat/conversation questions
    if (AIUtils.containsKeywords(promptLower, ['chat', 'message', 'conversation', 'websocket', 'socket'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Chat Module Query`);
      return {
        userResults: 8,
        coreResults: 3,
        userFilters: { eventstorm_module: 'chatModule' },
        coreFilters: { type: 'module_documentation' }
      };
    }
    
    // Git/repository questions
    if (AIUtils.containsKeywords(promptLower, ['git', 'repository', 'github', 'pull request', 'commit', 'branch'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Git Module Query`);
      return {
        userResults: 8,
        coreResults: 3,
        userFilters: { eventstorm_module: 'gitModule' },
        coreFilters: { type: 'module_documentation' }
      };
    }
    
    // AI/RAG/embedding questions
    if (AIUtils.containsKeywords(promptLower, ['ai', 'embedding', 'vector', 'rag', 'langchain', 'openai', 'semantic'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: AI Module Query`);
      return {
        userResults: 8,
        coreResults: 3,
        userFilters: { eventstorm_module: 'aiModule' },
        coreFilters: { type: 'module_documentation' }
      };
    }
    
    // Docs/documentation questions
    if (AIUtils.containsKeywords(promptLower, ['docs', 'documentation', 'search', 'knowledge', 'doc'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Docs Module Query`);
      return {
        userResults: 8,
        coreResults: 4,
        userFilters: { eventstorm_module: 'docsModule' },
        coreFilters: { type: 'module_documentation' }
      };
    }
    
    // Test/testing questions
    if (AIUtils.containsKeywords(promptLower, ['test', 'testing', 'spec', 'unit test', 'integration test'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Testing Query`);
      return {
        userResults: 8,
        coreResults: 2,
        userFilters: { semantic_role: 'test' },
        coreFilters: {}
      };
    }
    
    // Configuration/setup questions
    if (AIUtils.containsKeywords(promptLower, ['config', 'configuration', 'setup', 'environment', 'env', 'settings'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Configuration Query`);
      return {
        userResults: 6,
        coreResults: 4,
        userFilters: { semantic_role: 'config' },
        coreFilters: { type: 'configuration' }
      };
    }
    
    // Plugin/middleware questions
    if (AIUtils.containsKeywords(promptLower, ['plugin', 'middleware', 'interceptor', 'fastify plugin'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Plugin/Middleware Query`);
      return {
        userResults: 8,
        coreResults: 3,
        userFilters: { semantic_role: 'plugin' },
        coreFilters: {}
      };
    }
    
    // Default strategy for general questions
    console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: General Query (default)`);
    return {
      userResults: 8,
      coreResults: 4,
      userFilters: {},
      coreFilters: {}
    };
  }
}

module.exports = VectorSearchStrategy;
