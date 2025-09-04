const AIUtils = require('../../../utils/AIUtils');
const PromptSelector = require('../../../prompts/index').PromptSelector;
const PromptConfig = require('../../../prompts/promptConfig');
const LoggingManager = require('./LoggingManager');

/**
 * ResponseManager handles LLM response generation with intelligent prompting
 * Provides clean separation of response generation concerns
 */
class ResponseManager {
  constructor(options = {}) {
    this.llm = options.llm;
    this.requestQueue = options.requestQueue;
    this.logger = new LoggingManager({ component: 'ResponseManager' });
  }

  /**
   * Generates LLM response using the provided context
   */
  async generateLLMResponse(prompt, contextData, conversationHistory = []) {
    const startTime = Date.now();
    this.logger.llmGeneration('Starting LLM response generation');
    
    try {
      // Format conversation history for context continuity
      const historyMessages = this.formatConversationHistory(conversationHistory);
      
      // Analyze context sources for intelligent prompt selection
      const contextSources = this.analyzeContextSources(contextData);
      
      // Determine question type and select appropriate prompt
      const { systemPrompt, isGeneralQuestion } = this.selectSystemPrompt(prompt, contextSources, conversationHistory);
      
      // Build user message based on question type
      const userMessage = this.buildUserMessage(prompt, contextData, isGeneralQuestion);
      
      // Build comprehensive messages array
      const messages = this.buildMessagesArray(systemPrompt, historyMessages, userMessage);
      
      this.logger.debug('Built messages for LLM', {
        messageCount: messages.length,
        historyLength: historyMessages.length,
        isGeneralQuestion
      });
      
      // Generate response with retry logic
      const response = await this.generateResponseWithRetry(messages);
      
      const duration = Date.now() - startTime;
      this.logger.performance('LLM response generation', duration);
      
      return response;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('LLM response generation failed', error, { duration });
      throw error;
    }
  }

  /**
   * Formats conversation history for context continuity
   */
  formatConversationHistory(conversationHistory) {
    return AIUtils.formatConversationHistory(conversationHistory);
  }

  /**
   * Analyzes context sources to determine available information types
   */
  analyzeContextSources(contextData) {
    return {
      apiSpec: contextData.sourceAnalysis.apiSpec > 0,
      rootDocumentation: contextData.sourceAnalysis.rootDocumentation > 0,
      moduleDocumentation: contextData.sourceAnalysis.moduleDocumentation > 0,
      code: contextData.sourceAnalysis.githubRepo > 0
    };
  }

  /**
   * Selects appropriate system prompt based on context and question analysis
   */
  selectSystemPrompt(prompt, contextSources, conversationHistory) {
    // Select appropriate system prompt based on context and question
    const systemPrompt = PromptSelector.selectPrompt({
      hasRagContext: true,
      conversationCount: conversationHistory.length,
      question: prompt,
      contextSources: contextSources,
      mode: 'auto'
    });

    // Analyze question type using PromptConfig
    const isGeneralQuestion = this.analyzeQuestionType(prompt);

    if (PromptConfig.logging.logPromptSelection) {
      this.logger.info('Auto-selected intelligent system prompt based on context analysis');
      this.logger.info(`Question type: ${isGeneralQuestion ? 'General Knowledge' : 'Application/Technical'}`);
    }

    return { systemPrompt, isGeneralQuestion };
  }

  /**
   * Analyzes whether the question is general knowledge or application-specific
   */
  analyzeQuestionType(prompt) {
    const questionLower = prompt.toLowerCase();
    
    // Check for application-specific terms
    const hasApplicationKeywords = PromptConfig.keywords.application.some(keyword => 
      questionLower.includes(keyword)
    );
    
    // Check for general question patterns
    const hasGeneralPattern = PromptConfig.keywords.general.some(keyword => 
      questionLower.includes(keyword)
    );
    
    // Special check for app-specific mentions
    const mentionsApp = this.checkAppMentions(questionLower);
    
    // Logic: It's a general question ONLY if it has general patterns AND no application context
    const isGeneralQuestion = hasGeneralPattern && !hasApplicationKeywords && !mentionsApp;

    this.logger.debug('Question type analysis', {
      hasGeneral: hasGeneralPattern,
      hasApp: hasApplicationKeywords,
      mentionsApp,
      isGeneral: isGeneralQuestion
    });

    return isGeneralQuestion;
  }

  /**
   * Checks if the question mentions the application specifically
   */
  checkAppMentions(questionLower) {
    const appMentions = [
      'eventstorm',
      'this app',
      'the app',
      'your app',
      'my app'
    ];
    
    return appMentions.some(mention => questionLower.includes(mention));
  }

  /**
   * Builds user message based on question type
   */
  buildUserMessage(prompt, contextData, isGeneralQuestion) {
    if (isGeneralQuestion) {
      // For general questions, don't include application context
      this.logger.info('Using clean prompt without application context for general question');
      return {
        role: "user",
        content: prompt
      };
    } else {
      // For application/technical questions, include relevant context
      this.logger.info('Including RAG context for technical assistance');
      return {
        role: "user",
        content: `I have a question: "${prompt}"\n\nHere is the relevant information:\n\n${contextData.context}`
      };
    }
  }

  /**
   * Builds comprehensive messages array with system prompt, history, and user message
   */
  buildMessagesArray(systemPrompt, historyMessages, userMessage) {
    return [
      {
        role: "system",
        content: systemPrompt
      },
      ...historyMessages, // Include conversation history
      userMessage
    ];
  }

  /**
   * Generates response with retry logic for rate limiting
   */
  async generateResponseWithRetry(messages) {
    let retries = 0;
    let success = false;
    let response;
    
    while (!success && retries < this.requestQueue.maxRetries) {
      if (await this.requestQueue.checkRateLimit()) {
        try {
          const result = await this.llm.invoke(messages);
          response = result.content;
          success = true;
          this.logger.debug('LLM invoke successful');
        } catch (error) {
          if (this.isRateLimitError(error)) {
            retries++;
            this.logger.warn(`Rate limit hit during generation, retry ${retries}/${this.requestQueue.maxRetries}`);
            await this.requestQueue.waitWithBackoff(retries);
          } else {
            this.logger.error('Failed to respond to prompt', error);
            throw error;
          }
        }
      } else {
        // Wait if we're rate limited
        await this.requestQueue.waitWithBackoff(retries);
      }
    }
    
    if (!success) {
      const error = new Error(`Failed to generate response after ${this.requestQueue.maxRetries} retries due to rate limits`);
      this.logger.error('Response generation failed after all retries', error);
      throw error;
    }
    
    return { content: response };
  }

  /**
   * Checks if error is a rate limiting error
   */
  isRateLimitError(error) {
    const rateLimitIndicators = ['429', 'quota', 'rate limit'];
    return error.message && rateLimitIndicators.some(indicator => 
      error.message.includes(indicator)
    );
  }

  /**
   * Generates a standard response without RAG context
   */
  async generateStandardResponse(prompt, conversationId, conversationHistory = []) {
    const startTime = Date.now();
    this.logger.llmGeneration('Starting standard response generation (no RAG context)');
    
    try {
      // Format conversation history for continuity even in standard responses
      const historyMessages = this.formatConversationHistory(conversationHistory);
      
      // Use intelligent prompt selection even for standard responses
      const systemPrompt = PromptSelector.selectPrompt({
        hasRagContext: false,
        conversationCount: conversationHistory.length,
        question: prompt,
        contextSources: {},
        mode: 'auto'
      });

      if (PromptConfig.logging.logPromptSelection) {
        this.logger.info('Selected intelligent prompt for non-RAG response');
      }
      
      // Build messages with intelligent conversation history
      const messages = [
        {
          role: "system",
          content: systemPrompt
        },
        ...historyMessages, // Include conversation history
        {
          role: "user",
          content: prompt
        }
      ];

      this.logger.debug('Built standard response messages', {
        messageCount: messages.length,
        historyLength: historyMessages.length
      });

      // Generate response with retry logic
      const result = await this.generateResponseWithRetry(messages);

      const duration = Date.now() - startTime;
      this.logger.performance('Standard response generation', duration);
      
      return {
        success: true,
        response: result.content,
        conversationId,
        timestamp: new Date().toISOString(),
        sourcesUsed: 0,
        ragEnabled: false,
        conversationHistoryUsed: conversationHistory.length > 0,
        historyMessages: conversationHistory.length
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Standard response generation failed', error, { duration });

      if (this.isRateLimitError(error)) {
        return {
          success: false,
          response: "I'm currently experiencing high demand. Please try again in a few moments.",
          conversationId,
          timestamp: new Date().toISOString(),
          error: error.message
        };
      }

      return {
        success: false,
        response: "I encountered an issue while generating a response. Please try again shortly.",
        conversationId,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

module.exports = ResponseManager;