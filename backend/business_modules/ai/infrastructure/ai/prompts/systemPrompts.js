// systemPrompts.js
"use strict";

const PromptConfig = require('./promptConfig');

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
   * Main RAG system prompt - used when comprehensive context is available
   */
  ragSystem: (conversationCount = 0) => `You are an AI assistant with direct access to the user's actual codebase and application documentation.

� CRITICAL RULES - VIOLATION WILL BE FLAGGED:
1. **NEVER invent or assume file paths, directory structures, or code that isn't in the provided context**
2. **NEVER mention directories like "src/core/di" unless they actually exist in the provided code**
3. **ONLY reference files, functions, and implementations that are explicitly shown in the context**
4. **If information isn't in the context, say "I don't see that specific implementation in the provided code"**

🔍 YOU HAVE BEEN PROVIDED WITH:
- ✅ ACTUAL SOURCE CODE from their repositories
- ✅ REAL API specifications and schemas  
- ✅ ACTUAL configuration files and plugins
- ✅ REAL module documentation

🎯 MANDATORY RESPONSE APPROACH:
1. **START by examining the provided context sections carefully**
2. **ONLY describe what you can actually see in the context**
3. **Quote specific file names and code snippets from the context**
4. **If asked about something not in context, explicitly say so**
5. **NEVER fill gaps with assumptions or generic knowledge**

Example of CORRECT response pattern:
"Based on the actual code provided, I can see that in the file \`backend/diPlugin.js\` the DI is implemented using..."

Example of INCORRECT response pattern:
"The DI implementation can be found in the src/core/di directory..." (if this directory doesn't exist in the context)

📋 Context Structure:
- "💻 === ACTUAL SOURCE CODE ===" sections contain real implementation code
- "🌐 === API SPECIFICATION ===" sections contain real API definitions  
- "📋 === ROOT DOCUMENTATION ===" sections contain real configuration files
- "📁 === MODULE DOCUMENTATION ===" sections contain real module docs

${conversationCount > 0 ? `This conversation has ${conversationCount} previous exchanges. Use them for context continuity.` : 'This is the start of a new conversation.'}

🚨 FINAL REMINDER: Only describe what you can actually see in the provided context. Never invent file paths or implementations.`,

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
    
    // Check for general knowledge questions first using config
    const isGeneralQuestion = PromptConfig.keywords.general.some(keyword => questionLower.includes(keyword));
    
    // Check if question seems application-specific using config
    const isAppRelated = PromptConfig.keywords.application.some(keyword => questionLower.includes(keyword));

    // Check for API-specific questions
    const isApiRelated = PromptConfig.keywords.api.some(keyword => questionLower.includes(keyword));

    // Check for code-specific questions
    const isCodeRelated = PromptConfig.keywords.code.some(keyword => questionLower.includes(keyword));

    // HIGHEST PRIORITY: General questions override everything else (unless they contain app-specific terms)
    if (isGeneralQuestion && !isAppRelated) {
      return SystemPrompts.general(conversationCount);
    }

    // SECOND PRIORITY: App-related questions with context
    if (hasRagContext && isAppRelated) {
      if (isApiRelated && contextSources.apiSpec) {
        return SystemPrompts.apiSpecialist(conversationCount);
      }
      if (isCodeRelated && contextSources.code) {
        return SystemPrompts.codeAnalysis(conversationCount);
      }
      return SystemPrompts.ragSystem(conversationCount);
    }

    // THIRD PRIORITY: App-related questions without context
    if (isAppRelated) {
      if (isApiRelated) return SystemPrompts.apiSpecialist(conversationCount);
      if (isCodeRelated) return SystemPrompts.codeAnalysis(conversationCount);
      return SystemPrompts.standard(conversationCount);
    }

    // DEFAULT: For anything else (including general questions that weren't caught above)
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
