/**
 * Manages different LLM providers (OpenAI, Anthropic, Google, Ollama)
 */
class LLMProviderManager {
  constructor(provider = 'openai', options = {}) {
    this.provider = provider.toLowerCase();
    this.maxRetries = options.maxRetries || 10;
    this.llm = null;
    this.initializeLLM();
  }

  /**
   * Initialize LLM based on provider
   */
  initializeLLM() {
    try {
      switch (this.provider) {
        case 'openai': {
          console.log(`[${new Date().toISOString()}] Initializing OpenAI provider`);
          // Import here to avoid requiring if not using this provider
          const { ChatOpenAI } = require('@langchain/openai');
          this.llm = new ChatOpenAI({
            modelName: 'gpt-3.5-turbo',
            temperature: 0,
            apiKey: process.env.OPENAI_API_KEY,
            maxRetries: this.maxRetries,
            maxConcurrency: 2
          });
          break;
        }

        case 'anthropic': {
          console.log(`[${new Date().toISOString()}] Initializing Anthropic provider`);
          // Import here to avoid requiring if not using this provider
          const { ChatAnthropic } = require('@langchain/anthropic');
          this.llm = new ChatAnthropic({
            modelName: 'claude-3-haiku-20240307',
            temperature: 0,
            apiKey: process.env.ANTHROPIC_API_KEY,
            maxRetries: this.maxRetries,
            maxConcurrency: 1, // Reduced to 1 to avoid rate limiting
            streaming: false, // Disable streaming to reduce connection overhead
            timeout: 120000 // 2 minute timeout
          });
          break;
        }

        case 'google': {
          console.log(`[${new Date().toISOString()}] Initializing Google provider`);
          // Import here to avoid requiring if not using this provider
          const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
          this.llm = new ChatGoogleGenerativeAI({
            modelName: 'gemini-pro',
            apiKey: process.env.GOOGLE_API_KEY,
            maxRetries: this.maxRetries,
            maxConcurrency: 2
          });
          break;
        }

        case 'ollama': {
          console.log(`[${new Date().toISOString()}] Initializing Ollama provider`);
          // Import here to avoid requiring if not using this provider
          const { ChatOllama } = require('@langchain/ollama');
          this.llm = new ChatOllama({
            model: process.env.OLLAMA_MODEL || 'llama2',
            baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
            maxRetries: this.maxRetries
          });
          break;
        }

        default: {
          console.warn(`[${new Date().toISOString()}] Unknown provider: ${this.provider}, falling back to OpenAI`);
          const { ChatOpenAI: DefaultChatOpenAI } = require('@langchain/openai');
          this.llm = new DefaultChatOpenAI({
            modelName: 'gpt-3.5-turbo',
            temperature: 0,
            apiKey: process.env.OPENAI_API_KEY,
            maxRetries: this.maxRetries,
            maxConcurrency: 2
          });
        }
      }

      console.log(`[${new Date().toISOString()}] Successfully initialized LLM for provider: ${this.provider}`);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error initializing LLM for provider ${this.provider}:`, error.message);
      throw new Error(`Failed to initialize LLM provider ${this.provider}: ${error.message}`);
    }
  }

  /**
   * Get the initialized LLM instance
   */
  getLLM() {
    return this.llm;
  }

  /**
   * Change the provider and reinitialize
   */
  changeProvider(newProvider, options = {}) {
    this.provider = newProvider.toLowerCase();
    this.maxRetries = options.maxRetries || this.maxRetries;
    this.initializeLLM();
    return this.llm;
  }

  /**
   * Get current provider info
   */
  getProviderInfo() {
    return {
      provider: this.provider,
      maxRetries: this.maxRetries,
      isInitialized: this.llm !== null
    };
  }
}

module.exports = LLMProviderManager;
