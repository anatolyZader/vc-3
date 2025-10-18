const ConversationFormatter = require('./conversationFormatter');
const PromptSelector = require('../../prompts/index').PromptSelector;
const PromptConfig = require('../../prompts/promptConfig');

class ResponseGenerator {
  constructor(llm, requestQueue) {
    this.llm = llm;
    this.requestQueue = requestQueue;
  }

  async generateWithContext(prompt, contextData, conversationHistory = []) {
    const historyMessages = ConversationFormatter.formatConversationHistory(conversationHistory);
    const systemPrompt = this.selectSystemPrompt(prompt, contextData, conversationHistory);
    const userMessage = this.buildUserMessage(prompt, contextData);
    
    const messages = [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      userMessage
    ];
    
    console.log(`[${new Date().toISOString()}] 🔍 CONVERSATION CONTEXT: Built ${messages.length} messages for LLM (1 system + ${historyMessages.length} history + 1 current)`);
    
    const response = await this.generateResponseWithRetry(messages);
    
    // Validate context usage if we have codebase content
    if (contextData.sourceAnalysis.githubRepo > 0 || contextData.sourceAnalysis.rootDocumentation > 0) {
      this.validateContextUsage(response.content, contextData, prompt);
    }
    
    return response;
  }

  async generateStandard(prompt, conversationHistory = []) {
    const historyMessages = ConversationFormatter.formatConversationHistory(conversationHistory);
    
    const systemPrompt = PromptSelector.selectPrompt({
      hasRagContext: false,
      conversationCount: conversationHistory.length,
      question: prompt,
      contextSources: {},
      mode: 'auto'
    });

    if (PromptConfig.logging.logPromptSelection) {
      console.log(`[${new Date().toISOString()}] 🎯 STANDARD RESPONSE: Selected intelligent prompt for non-RAG response`);
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      { role: "user", content: prompt }
    ];

    console.log(`[${new Date().toISOString()}] 🔍 STANDARD RESPONSE: Built ${messages.length} messages with conversation history (1 system + ${historyMessages.length} history + 1 current)`);

    return await this.generateResponseWithRetry(messages);
  }

  selectSystemPrompt(prompt, contextData, conversationHistory) {
    const contextSources = {
      apiSpec: contextData.sourceAnalysis.apiSpec > 0,
      rootDocumentation: contextData.sourceAnalysis.rootDocumentation > 0,
      moduleDocumentation: contextData.sourceAnalysis.moduleDocumentation > 0,
      code: contextData.sourceAnalysis.githubRepo > 0
    };

    return PromptSelector.selectPrompt({
      hasRagContext: true,
      conversationCount: conversationHistory.length,
      question: prompt,
      contextSources: contextSources,
      mode: 'auto'
    });
  }

  buildUserMessage(prompt, contextData) {
    const isGeneralQuestion = this.isGeneralQuestion(prompt);
    
    if (isGeneralQuestion) {
      console.log(`[${new Date().toISOString()}] 🔍 GENERAL QUESTION: Using clean prompt without application context`);
      return { role: "user", content: prompt };
    } else {
      console.log(`[${new Date().toISOString()}] 🔍 APPLICATION QUESTION: Including RAG context for technical assistance`);
      return {
        role: "user", 
        content: `USER QUESTION: "${prompt}"

🔍 AVAILABLE CONTEXT FROM YOUR ACTUAL CODEBASE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${contextData.context}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 CONTEXT SUMMARY:
- 📁 Total sources: ${contextData.sourceAnalysis.total} documents
- 💻 Source code files: ${contextData.sourceAnalysis.githubRepo} files  
- 📋 Documentation: ${contextData.sourceAnalysis.rootDocumentation + contextData.sourceAnalysis.moduleDocumentation} docs
- 🌐 API specs: ${contextData.sourceAnalysis.apiSpec} specs

🎯 INSTRUCTION: Answer the user's question using the ACTUAL CODE and DOCUMENTATION provided above. Reference specific files and implementations from the context.`
      };
    }
  }

  isGeneralQuestion(prompt) {
    const questionLower = prompt.toLowerCase();
    
    // Check for application-specific terms
    const hasApplicationKeywords = PromptConfig.keywords.application.some(keyword => questionLower.includes(keyword));
    
    // Check for general question patterns
    const hasGeneralPattern = PromptConfig.keywords.general.some(keyword => questionLower.includes(keyword));
    
    // Special check for app-specific mentions
    const mentionsApp = questionLower.includes('eventstorm') || 
                      questionLower.includes('this app') || 
                      questionLower.includes('the app') ||
                      questionLower.includes('your app') ||
                      questionLower.includes('my app');
    
    // Logic: It's a general question ONLY if it has general patterns AND no application context
    const isGeneralQuestion = hasGeneralPattern && !hasApplicationKeywords && !mentionsApp;

    if (PromptConfig.logging.logPromptSelection) {
      console.log(`[${new Date().toISOString()}] 🎯 PROMPT SELECTION: Auto-selected intelligent system prompt based on context analysis`);
      console.log(`[${new Date().toISOString()}] 🎯 QUESTION TYPE: ${isGeneralQuestion ? 'General Knowledge' : 'Application/Technical'}`);
      console.log(`[${new Date().toISOString()}] 🔍 Analysis: hasGeneral=${hasGeneralPattern}, hasApp=${hasApplicationKeywords}, mentionsApp=${mentionsApp}`);
    }
    
    return isGeneralQuestion;
  }

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
          console.log(`[${new Date().toISOString()}] LLM invoke successful`);
        } catch (error) {
          if (this.isRateLimitError(error)) {
            retries++;
            console.warn(`[${new Date().toISOString()}] Rate limit hit during generation, retry ${retries}/${this.requestQueue.maxRetries}`);
            await this.requestQueue.waitWithBackoff(retries);
          } else {
            console.error(`[${new Date().toISOString()}] Failed to respond to prompt:`, error);
            throw error;
          }
        }
      } else {
        await this.requestQueue.waitWithBackoff(retries);
      }
    }
    
    if (!success) {
      throw new Error(`Failed to generate response after ${this.requestQueue.maxRetries} retries due to rate limits`);
    }
    
    return { content: response };
  }

  isRateLimitError(error) {
    return error.message && (
      error.message.includes('429') || 
      error.message.includes('quota') || 
      error.message.includes('rate limit')
    );
  }

  validateContextUsage(response, contextData, prompt) {
    const responseLower = response.toLowerCase();
    const hasCodebaseContext = contextData.sourceAnalysis.githubRepo > 0;
    
    // Check for problematic generic responses when we have actual code
    const genericPhrases = [
      'without access to the actual source code',
      'without access to the source code', 
      'without seeing the actual code',
      'without access to your codebase',
      'i don\'t have access to',
      'i can\'t see the specific implementation',
      'based on general knowledge'
    ];
    
    const hasGenericResponse = genericPhrases.some(phrase => responseLower.includes(phrase));
    
    if (hasCodebaseContext && hasGenericResponse) {
      console.warn(`[${new Date().toISOString()}] ⚠️ CONTEXT VALIDATION: AI gave generic response despite having ${contextData.sourceAnalysis.githubRepo} code files and ${contextData.sourceAnalysis.total} total documents`);
      console.warn(`[${new Date().toISOString()}] ⚠️ Query: "${prompt.substring(0, 100)}..."`);
      console.warn(`[${new Date().toISOString()}] ⚠️ Response contained generic phrase - this suggests prompt engineering needs improvement`);
    } else if (hasCodebaseContext) {
      console.log(`[${new Date().toISOString()}] ✅ CONTEXT VALIDATION: AI appears to have used provided codebase context (${contextData.sourceAnalysis.total} documents)`);
    }
  }
}

module.exports = ResponseGenerator;
