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
    
    // Check for explicit file mentions first
    const filePattern = /([a-zA-Z0-9_\-\.]+\.(js|ts|jsx|tsx|py|java|go|md|json|yaml|yml))/gi;
    const mentionedFiles = prompt.match(filePattern);
    
    if (mentionedFiles && mentionedFiles.length > 0) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Explicit File Request (${mentionedFiles.join(', ')})`);
      
      // Calculate dynamic code results based on number of files mentioned
      // Allocate approximately 8-10 chunks per file, with a reasonable maximum
      const codeResultsForFiles = Math.min(30, Math.max(20, mentionedFiles.length * 8));
      
      return {
        codeResults: codeResultsForFiles,
        docsResults: 5,
        codeFilters: {
          // Prioritize actual code and docs over configs/catalogs
          type: { $in: ['github-code', 'github-test', 'github-docs'] }
        },
        docsFilters: {},
        explicitFiles: mentionedFiles,
        priority: 'file-specific'
      };
    }
    
    // Domain/business logic questions
    if (TextMatcher.containsKeywords(promptLower, ['domain', 'entity', 'business', 'rule', 'aggregate', 'model'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Domain/Business Logic Query`);
      return {
        codeResults: 15,
        docsResults: 8,
        codeFilters: { type: { $in: ['github-code'] } },
        docsFilters: { type: 'module_documentation' }
      };
    }
    
    // API/endpoint questions
    if (TextMatcher.containsKeywords(promptLower, ['api', 'endpoint', 'route', 'http', 'request', 'controller', 'fastify'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: API/Endpoint Query`);
      return {
        codeResults: 20,
        docsResults: 10,
        codeFilters: { type: { $in: ['github-code'] } },
        docsFilters: { type: 'apiSpec' }
      };
    }
    
    // Error/debugging questions
    if (TextMatcher.containsKeywords(promptLower, ['error', 'bug', 'fix', 'debug', 'issue', 'problem', 'exception', 'fail'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Error/Debugging Query`);
      return {
        codeResults: 20,
        docsResults: 5,
        codeFilters: { type: { $in: ['github-code', 'github-test'] } },
        docsFilters: {}
      };
    }
    
    // Chat/conversation questions
    if (TextMatcher.containsKeywords(promptLower, ['chat', 'message', 'conversation', 'websocket', 'socket'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Chat Module Query`);
      return {
        codeResults: 15,
        docsResults: 5,
        codeFilters: { type: { $in: ['github-code'] } },
        docsFilters: { type: 'module_documentation' }
      };
    }
    
    // Git/repository questions
    if (TextMatcher.containsKeywords(promptLower, ['git', 'repository', 'github', 'pull request', 'commit', 'branch'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Git Module Query`);
      return {
        codeResults: 15,
        docsResults: 5,
        codeFilters: { type: { $in: ['github-code'] } },
        docsFilters: { type: 'module_documentation' }
      };
    }
    
    // AI/RAG/embedding questions
    if (TextMatcher.containsKeywords(promptLower, ['ai', 'embedding', 'vector', 'rag', 'langchain', 'openai', 'semantic'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: AI Module Query`);
      return {
        codeResults: 15,
        docsResults: 8,
        codeFilters: { type: { $in: ['github-code'] } },
        docsFilters: { type: 'module_documentation' }
      };
    }
    
    // Docs/documentation questions
    if (TextMatcher.containsKeywords(promptLower, ['docs', 'documentation', 'readme', 'how to'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Documentation Query`);
      return {
        codeResults: 8,
        docsResults: 12,
        codeFilters: { type: { $in: ['github-docs'] } },
        docsFilters: { type: 'module_documentation' }
      };
    }
    
    // Test/testing questions
    if (TextMatcher.containsKeywords(promptLower, ['test', 'testing', 'spec', 'unit test', 'integration test'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Testing Query`);
      return {
        codeResults: 15,
        docsResults: 5,
        codeFilters: { type: { $in: ['github-test', 'github-code'] } },
        docsFilters: {}
      };
    }
    
    // Configuration/setup questions
    if (TextMatcher.containsKeywords(promptLower, ['config', 'configuration', 'setup', 'environment', 'env', 'settings'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Configuration Query`);
      return {
        codeResults: 10,
        docsResults: 12,
        codeFilters: { type: { $in: ['github-config', 'github-code'] } },
        docsFilters: { type: 'configuration' }
      };
    }
    
    // Plugin/middleware questions
    if (TextMatcher.containsKeywords(promptLower, ['plugin', 'middleware', 'interceptor', 'fastify plugin'])) {
      console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: Plugin/Middleware Query`);
      return {
        codeResults: 15,
        docsResults: 8,
        codeFilters: { type: { $in: ['github-code'] } },
        docsFilters: {}
      };
    }
    
    // Default strategy for general questions - exclude catalogs and configs
    console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: General Query (default)`);
    return {
      codeResults: 20,
      docsResults: 10,
      codeFilters: {
        type: { $nin: ['github-catalog', 'github-config'] }  // Exclude catalogs and configs
      },
      docsFilters: {}
    };
  }
}

module.exports = VectorSearchStrategy;
