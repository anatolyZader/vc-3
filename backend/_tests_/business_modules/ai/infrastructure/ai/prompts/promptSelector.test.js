'use strict';

const path = require('path');

describe('Prompt system (SystemPrompts + PromptSelector)', () => {
  let prompts;

  beforeEach(() => {
    jest.resetModules();
    prompts = require(path.resolve(__dirname, '../../../../../../business_modules/ai/infrastructure/ai/prompts'));
  });

  test('selectPrompt returns General for clearly general questions', () => {
    const { PromptSelector } = prompts;
    const prompt = PromptSelector.selectPrompt({
      hasRagContext: false,
      conversationCount: 0,
      question: 'What is the history of the Roman Empire?'
    });
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(10);
  });

  test('selectPrompt prefers RAG system when app-related and has context', () => {
    const { PromptSelector } = prompts;
    const prompt = PromptSelector.selectPrompt({
      hasRagContext: true,
      conversationCount: 3,
      question: 'How does the API endpoint /ai/respond work in this application?',
      contextSources: { apiSpec: true, code: true }
    });
    expect(typeof prompt).toBe('string');
    expect(prompt.toLowerCase()).toContain('this conversation has 3 previous exchanges');
  });

  test('manual modes return expected prompt variants', () => {
    const { PromptSelector } = prompts;
    const modes = ['rag', 'standard', 'code', 'api', 'general', 'fallback'];
    for (const mode of modes) {
      const text = PromptSelector.selectPrompt({ mode, conversationCount: 1 });
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(10);
    }
  });

  test('validateOptions falls back invalid mode to auto', () => {
    const { PromptSelector } = prompts;
    const normalized = PromptSelector.validateOptions({ mode: 'unknown' });
    expect(normalized.mode).toBe('auto');
  });
});
