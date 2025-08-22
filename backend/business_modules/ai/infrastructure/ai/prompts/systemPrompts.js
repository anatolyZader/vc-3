// systemPrompts.js
"use strict";

/**
 * Centralized System Prompts Configuration
 * 
 * This file contains all system prompts used across the AI system.
 * Benefits:
 * - Easy to modify prompts without touching core logic
 * - Version control for prompt changes
 * - Consistent prompts across different modules
 * - A/B testing capabilities
 * - Better prompt engineering workflow
 */

const SystemPrompts = {
  /**
   * Main RAG system prompt - used when comprehensive context is availablee
   */
  ragSystem: (conversationCount = 0) => `You are a helpful AI assistant with expertise in software development and general knowledge.

You have access to comprehensive information about the user's application:
- Code repository with source files and implementation details
- API specification with endpoints and schemas
- Root documentation covering plugins and core configuration files
- Module-specific documentation for each business component

When answering questions:
1. For questions about the user's application, use the provided context and cite specific sources
2. For general questions not related to the application, use your general knowledge and clearly indicate you're answering from general knowledge
3. Integrate information from multiple sources when helpful for application-related questions
4. Maintain conversation continuity by referencing previous exchanges when relevant
5. Always provide accurate, helpful, and concise responses
6. If unsure whether a question relates to the application, ask for clarification

The context is organized by sections (API SPECIFICATION, ROOT DOCUMENTATION, MODULE DOCUMENTATION, CODE REPOSITORY) to help you understand the source of information.

${conversationCount > 0 ? `This conversation has ${conversationCount} previous exchanges. Use them for context continuity.` : 'This is the start of a new conversation.'}`,

  /**
   * Standard system prompt - used when no RAG context is available
   */
  standard: (conversationCount = 0) => `You are a helpful AI assistant with expertise in software development and general knowledge.

Provide accurate, helpful, and concise responses to all questions, whether they're about software development, general knowledge, or any other topic.

${conversationCount > 0 ? `This conversation has ${conversationCount} previous exchanges. Use them for context continuity when relevant.` : 'This is the start of a new conversation.'}`,

  /**
   * Specialized prompt for code analysis and debugging
   */
  codeAnalysis: (conversationCount = 0) => `You are an expert software engineer and code analyst.

You excel at:
- Code review and optimization suggestions
- Debugging and error analysis
- Architecture and design pattern recommendations
- Performance optimization
- Security vulnerability identification
- Code quality assessment

When analyzing code:
1. Be specific about issues and improvements
2. Provide code examples when helpful
3. Explain the reasoning behind your suggestions
4. Consider maintainability, readability, and performance
5. Reference best practices and industry standards

${conversationCount > 0 ? `This conversation has ${conversationCount} previous exchanges. Use them for context continuity.` : 'This is the start of a new conversation.'}`,

  /**
   * API-focused prompt for endpoint and specification questions
   */
  apiSpecialist: (conversationCount = 0) => `You are an API design and documentation specialist.

You excel at:
- REST API design and best practices
- OpenAPI/Swagger specification analysis
- API security and authentication patterns
- Rate limiting and performance optimization
- API versioning strategies
- Integration patterns and error handling

When discussing APIs:
1. Reference specific endpoints and methods when relevant
2. Consider HTTP status codes and error responses
3. Think about authentication and authorization
4. Address scalability and performance concerns
5. Suggest improvements based on industry standards

${conversationCount > 0 ? `This conversation has ${conversationCount} previous exchanges. Use them for context continuity.` : 'This is the start of a new conversation.'}`,

  /**
   * General knowledge prompt - for non-technical questions
   */
  general: (conversationCount = 0) => `You are a knowledgeable AI assistant with broad expertise across many topics.

You provide helpful, accurate, and engaging responses to questions about:
- Science, history, literature, and arts
- Current events and general knowledge
- Explanations of concepts and phenomena
- Creative and analytical thinking
- Problem-solving and decision-making

Always:
1. Be accurate and cite sources when possible
2. Acknowledge when you're uncertain
3. Provide context and background information
4. Use examples to illustrate complex concepts
5. Maintain a helpful and conversational tone

${conversationCount > 0 ? `This conversation has ${conversationCount} previous exchanges. Use them for context continuity.` : 'This is the start of a new conversation.'}`,

  /**
   * Fallback prompt for error situations
   */
  fallback: () => `You are a helpful AI assistant. Due to a technical issue, I have limited context about your specific application, but I'll do my best to provide helpful responses based on general knowledge and software development expertise.

Please let me know how I can assist you, and I'll provide the best answer I can.`
};

/**
 * Prompt selection logic based on context and question type
 */
const PromptSelector = {
  /**
   * Select appropriate system prompt based on available context and question content
   */
  selectPrompt(options = {}) {
    const {
      hasRagContext = false,
      conversationCount = 0,
      question = '',
      contextSources = {},
      mode = 'auto'
    } = options;

    // Manual mode selection
    if (mode !== 'auto') {
      switch (mode) {
        case 'rag':
          return SystemPrompts.ragSystem(conversationCount);
        case 'standard':
          return SystemPrompts.standard(conversationCount);
        case 'code':
          return SystemPrompts.codeAnalysis(conversationCount);
        case 'api':
          return SystemPrompts.apiSpecialist(conversationCount);
        case 'general':
          return SystemPrompts.general(conversationCount);
        case 'fallback':
          return SystemPrompts.fallback();
        default:
          return SystemPrompts.standard(conversationCount);
      }
    }

    // Auto-selection logic
    const questionLower = question.toLowerCase();
    
    // Check if question seems application-specific
    const appKeywords = ['api', 'endpoint', 'database', 'function', 'method', 'class', 'component', 'module', 'service', 'error', 'bug', 'code', 'implementation'];
    const isAppRelated = appKeywords.some(keyword => questionLower.includes(keyword)) || hasRagContext;

    // Check for API-specific questions
    const apiKeywords = ['rest', 'endpoint', 'http', 'get', 'post', 'put', 'delete', 'swagger', 'openapi', 'json', 'response'];
    const isApiRelated = apiKeywords.some(keyword => questionLower.includes(keyword));

    // Check for code-specific questions
    const codeKeywords = ['function', 'method', 'class', 'variable', 'loop', 'condition', 'syntax', 'debug', 'error', 'exception'];
    const isCodeRelated = codeKeywords.some(keyword => questionLower.includes(keyword));

    // Select prompt based on context and question analysis
    if (hasRagContext && isAppRelated) {
      if (isApiRelated && contextSources.apiSpec) {
        return SystemPrompts.apiSpecialist(conversationCount);
      }
      if (isCodeRelated && contextSources.code) {
        return SystemPrompts.codeAnalysis(conversationCount);
      }
      return SystemPrompts.ragSystem(conversationCount);
    }

    if (isAppRelated) {
      if (isApiRelated) return SystemPrompts.apiSpecialist(conversationCount);
      if (isCodeRelated) return SystemPrompts.codeAnalysis(conversationCount);
      return SystemPrompts.standard(conversationCount);
    }

    // For general questions, use general knowledge prompt
    return SystemPrompts.general(conversationCount);
  },

  /**
   * Get available prompt modes for debugging/testing
   */
  getAvailableModes() {
    return ['auto', 'rag', 'standard', 'code', 'api', 'general', 'fallback'];
  },

  /**
   * Validate prompt selection options
   */
  validateOptions(options) {
    const { mode = 'auto' } = options;
    const availableModes = this.getAvailableModes();
    
    if (!availableModes.includes(mode)) {
      console.warn(`[${new Date().toISOString()}] Invalid prompt mode: ${mode}, falling back to 'auto'`);
      return { ...options, mode: 'auto' };
    }
    
    return options;
  }
};

module.exports = {
  SystemPrompts,
  PromptSelector
};
