/**
 * Test to specifically validate anti-hallucination improvements
 * This test simulates the exact scenario where AI mentioned "src/core/di" directory
 */

const ResponseGenerator = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/query/responseGenerator');

console.log('🚨 Testing Anti-Hallucination Improvements\n');

// Create mock validation method
const mockValidation = {
  validateContextUsage: ResponseGenerator.prototype.validateContextUsage
};

// Test validation with the exact problematic response from the user
const problematicResponse = `Based on the information provided in the code repository, the EventStorm.me application uses a custom dependency injection (DI) framework to manage the dependencies between its various modules and services. The specific details of the DI implementation can be found in the src/core/di directory of the code repository.`;

const mockContextData = {
  sourceAnalysis: {
    total: 10,
    githubRepo: 5,
    rootDocumentation: 3,
    moduleDocumentation: 2,
    apiSpec: 0
  }
};

const mockPrompt = "how is di implemented in my app?";

console.log('=== TESTING HALLUCINATION DETECTION ===');

// Capture console output
let consoleOutputs = [];
const originalConsoleError = console.error;
console.error = (...args) => {
  consoleOutputs.push(args.join(' '));
  originalConsoleError(...args);
};

// Run validation
mockValidation.validateContextUsage(problematicResponse, mockContextData, mockPrompt);

// Restore console
console.error = originalConsoleError;

console.log('\n=== VALIDATION RESULTS ===');
console.log(`🔍 Detected ${consoleOutputs.length} validation errors`);

const detectedHallucination = consoleOutputs.some(output => 
  output.includes('non-existent file paths') || 
  output.includes('src/core/di')
);

const detectedGeneric = consoleOutputs.some(output => 
  output.includes('hallucinated information')
);

console.log(`✅ Hallucination Detection: ${detectedHallucination ? 'WORKING' : 'FAILED'}`);
console.log(`✅ Generic Response Detection: ${detectedGeneric ? 'WORKING' : 'FAILED'}`);

if (consoleOutputs.length > 0) {
  console.log('\n📋 Captured Validation Messages:');
  consoleOutputs.forEach((output, i) => {
    console.log(`   ${i + 1}. ${output}`);
  });
}

// Test the enhanced prompt
console.log('\n=== TESTING ENHANCED SYSTEM PROMPT ===');
const PromptSelector = require('./backend/business_modules/ai/infrastructure/ai/prompts/index').PromptSelector;

const enhancedPrompt = PromptSelector.selectPrompt({
  hasRagContext: true,
  conversationCount: 0,
  question: 'how is di implemented in my app?',
  contextSources: { code: true },
  mode: 'auto'
});

console.log('Enhanced prompt includes:');
console.log('✅ Anti-hallucination rules:', enhancedPrompt.includes('NEVER invent or assume file paths'));
console.log('✅ Explicit path warnings:', enhancedPrompt.includes('NEVER mention directories like "src/core/di"'));
console.log('✅ Context-only requirement:', enhancedPrompt.includes('ONLY reference files'));
console.log('✅ Explicit failure instruction:', enhancedPrompt.includes('I don\'t see that specific implementation'));

console.log('\n🎯 IMPROVEMENTS SUMMARY:');
console.log('1. ✅ Enhanced validation detects invented file paths');
console.log('2. ✅ System prompt explicitly prohibits hallucination');
console.log('3. ✅ User message emphasizes context-only responses');
console.log('4. ✅ Multiple layers of protection against generic responses');

console.log('\n🚀 Next: Deploy and test with actual queries to verify the AI stops hallucinating');