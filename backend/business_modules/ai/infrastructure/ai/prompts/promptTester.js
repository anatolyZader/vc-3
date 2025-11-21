// promptTester.js
"use strict";

/**
 * Prompt Testing and Management Utility
 * 
 * This utility helps test and manage different prompts for development and optimization.
 * Usage:
 *   const PromptTester = require('./promptTester');
 *   const testResult = PromptTester.testPromptSelection('What is the history of planet Earth?');
 */

const { SystemPrompts, PromptSelector } = require('./systemPrompts');
const PromptConfig = require('./promptConfig');

class PromptTester {
  /**
   * Test prompt selection with various inputs
   */
  static testPromptSelection(question, options = {}) {
    const defaultOptions = {
      hasRagContext: false,
      conversationCount: 0,
      contextSources: {},
      mode: 'auto'
    };
    
    const testOptions = { ...defaultOptions, ...options };
    const selectedPrompt = PromptSelector.selectPrompt({
      ...testOptions,
      question
    });

    return {
      question,
      options: testOptions,
      selectedPrompt: selectedPrompt.substring(0, 200) + '...',
      promptType: this.identifyPromptType(selectedPrompt),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Identify which prompt type was selected
   */
  static identifyPromptType(prompt) {
    if (prompt.includes('comprehensive information about the user\'s application')) return 'RAG';
    if (prompt.includes('expert software engineer and code analyst')) return 'Code Analysis';
    if (prompt.includes('API design and documentation specialist')) return 'API Specialist';
    if (prompt.includes('broad expertise across many topics')) return 'General';
    if (prompt.includes('software development and general knowledge')) return 'Standard';
    if (prompt.includes('Due to a technical issue')) return 'Fallback';
    return 'Unknown';
  }

  /**
   * Run comprehensive prompt selection tests
   */
  static runTests() {
    const testCases = [
      // General knowledge questions
      { question: "Tell me about the history of planet Earth", expected: 'General' },
      { question: "What is quantum physics?", expected: 'General' },
      { question: "How does photosynthesis work?", expected: 'General' },
      
      // Application-specific questions
      { question: "How do I fix this API endpoint error?", expected: 'API Specialist' },
      { question: "What functions are available in the chat module?", expected: 'RAG' },
      { question: "Show me the user authentication flow", expected: 'RAG' },
      
      // Code-related questions
      { question: "How can I optimize this function for better performance?", expected: 'Code Analysis' },
      { question: "What's wrong with this JavaScript method?", expected: 'Code Analysis' },
      { question: "Debug this syntax error in my class", expected: 'Code Analysis' },
      
      // API-related questions
      { question: "What's the correct HTTP status code for this endpoint?", expected: 'API Specialist' },
      { question: "How do I implement rate limiting for REST API?", expected: 'API Specialist' },
    ];

    console.log('\n🧪 PROMPT SELECTION TESTS');
    console.log('=' .repeat(50));

    const results = testCases.map(testCase => {
      const result = this.testPromptSelection(testCase.question);
      const passed = result.promptType === testCase.expected;
      
      console.log(`\n❓ Question: ${testCase.question}`);
      console.log(`🎯 Expected: ${testCase.expected}`);
      console.log(`🤖 Selected: ${result.promptType}`);
      console.log(`${passed ? '✅' : '❌'} ${passed ? 'PASS' : 'FAIL'}`);
      
      return {
        ...testCase,
        actual: result.promptType,
        passed
      };
    });

    const passCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    
    console.log('\n📊 TEST SUMMARY');
    console.log('=' .repeat(50));
    console.log(`Passed: ${passCount}/${totalCount} (${Math.round((passCount/totalCount)*100)}%)`);
    
    return results;
  }

  /**
   * Interactive prompt testing for development
   */
  static interactiveTest(question, ragContext = false, conversationCount = 0) {
    const contextSources = {
      apiSpec: ragContext,
      rootDocumentation: ragContext,
      moduleDocumentation: ragContext,
      code: ragContext
    };

    console.log('\n🔍 INTERACTIVE PROMPT TEST');
    console.log('=' .repeat(40));
    console.log(`Question: ${question}`);
    console.log(`RAG Context: ${ragContext}`);
    console.log(`Conversation Count: ${conversationCount}`);

    const result = this.testPromptSelection(question, {
      hasRagContext: ragContext,
      conversationCount,
      contextSources
    });

    console.log(`\nSelected Prompt Type: ${result.promptType}`);
    console.log(`Full Prompt Preview:\n${result.selectedPrompt}`);
    
    return result;
  }

  /**
   * Compare prompts for A/B testing
   */
  static comparePrompts(question, options1, options2) {
    const result1 = this.testPromptSelection(question, options1);
    const result2 = this.testPromptSelection(question, options2);

    console.log('\n🆚 PROMPT COMPARISON');
    console.log('=' .repeat(40));
    console.log(`Question: ${question}\n`);
    
    console.log('Option 1:');
    console.log(`  Type: ${result1.promptType}`);
    console.log(`  Options: ${JSON.stringify(options1, null, 2)}`);
    
    console.log('\nOption 2:');
    console.log(`  Type: ${result2.promptType}`);
    console.log(`  Options: ${JSON.stringify(options2, null, 2)}`);

    return { result1, result2 };
  }

  /**
   * Get all available prompt modes for reference
   */
  static getPromptModes() {
    return PromptSelector.getAvailableModes();
  }

  /**
   * Get current prompt configuration
   */
  static getConfig() {
    return PromptConfig;
  }
}

module.exports = PromptTester;
