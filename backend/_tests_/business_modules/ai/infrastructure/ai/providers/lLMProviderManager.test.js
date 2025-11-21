'use strict';

const path = require('path');

describe('LLMProviderManager', () => {
  const managerPath = path.resolve(
    __dirname,
    '../../../../../../business_modules/ai/infrastructure/ai/providers/lLMProviderManager.js'
  );

  const envBackup = { ...process.env };

  let openaiCtor;
  let anthropicCtor;
  let googleCtor;
  let ollamaCtor;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...envBackup };
    process.env.OPENAI_API_KEY = 'sk-openai';
    process.env.ANTHROPIC_API_KEY = 'sk-anthropic';
    process.env.GOOGLE_API_KEY = 'sk-google';
    process.env.OLLAMA_MODEL = 'llama3';
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434';

    openaiCtor = jest.fn();
    anthropicCtor = jest.fn();
    googleCtor = jest.fn();
    ollamaCtor = jest.fn();
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  function withMocks(run) {
    jest.isolateModules(() => {
      jest.doMock('@langchain/openai', () => ({ ChatOpenAI: openaiCtor }), { virtual: true });
      jest.doMock('@langchain/anthropic', () => ({ ChatAnthropic: anthropicCtor }), { virtual: true });
      jest.doMock('@langchain/google-genai', () => ({ ChatGoogleGenerativeAI: googleCtor }), { virtual: true });
      jest.doMock('@langchain/community/chat_models/ollama', () => ({ ChatOllama: ollamaCtor }), { virtual: true });
      run();
    });
  }

  test('defaults to OpenAI and initializes with expected options', () => {
    withMocks(() => {
      const LLMProviderManager = require(managerPath);
      // no args -> default provider 'openai'
      new LLMProviderManager();
      expect(openaiCtor).toHaveBeenCalledWith(
        expect.objectContaining({
          modelName: 'gpt-3.5-turbo',
          temperature: 0,
          apiKey: 'sk-openai',
          maxRetries: 10,
          maxConcurrency: 2
        })
      );
    });
  });

  test('changeProvider to anthropic uses Anthropic client and options override', () => {
    withMocks(() => {
      const LLMProviderManager = require(managerPath);
      const mgr = new LLMProviderManager('openai', { maxRetries: 3 });
      expect(openaiCtor).toHaveBeenCalled();

      mgr.changeProvider('anthropic', { maxRetries: 7 });
      expect(anthropicCtor).toHaveBeenCalledWith(
        expect.objectContaining({
          modelName: 'claude-3-haiku-20240307',
          temperature: 0,
          apiKey: 'sk-anthropic',
          maxRetries: 7,
          maxConcurrency: 1,
          streaming: false,
          timeout: 120000
        })
      );
      const info = mgr.getProviderInfo();
      expect(info).toEqual(expect.objectContaining({ provider: 'anthropic', isInitialized: true }));
    });
  });

  test('google provider uses ChatGoogleGenerativeAI with expected options', () => {
    withMocks(() => {
      const LLMProviderManager = require(managerPath);
      new LLMProviderManager('google');
      expect(googleCtor).toHaveBeenCalledWith(
        expect.objectContaining({
          modelName: 'gemini-pro',
          apiKey: 'sk-google',
          maxRetries: 10,
          maxConcurrency: 2
        })
      );
    });
  });

  test('ollama provider uses ChatOllama with env model and baseUrl', () => {
    withMocks(() => {
      const LLMProviderManager = require(managerPath);
      new LLMProviderManager('ollama');
      expect(ollamaCtor).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'llama3',
          baseUrl: 'http://localhost:11434',
          maxRetries: 10
        })
      );
    });
  });

  test('unknown provider falls back to OpenAI and warns', () => {
    withMocks(() => {
      const warnSpy = jest.spyOn(global.console, 'warn').mockImplementation(() => {});
      const LLMProviderManager = require(managerPath);
      new LLMProviderManager('unknown');
      expect(openaiCtor).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});
