// Quick test to verify prompt selection
const { PromptSelector } = require('./systemPrompts');
const PromptConfig = require('./promptConfig');

console.log('🧪 Testing prompt selection...\n');
console.log('📋 PromptConfig keys:', Object.keys(PromptConfig));
console.log('📋 PromptConfig:', PromptConfig);

// Test cases
const testCases = [
  'tell me the short history of Earth',
  'who invented radio?',
  'what is quantum physics?',
  'how do I fix this API endpoint error?',
  'debug this JavaScript function',
  'what functions are in the chat module?'
];

testCases.forEach(question => {
  console.log(`\n❓ Testing: "${question}"`);
  
  // Debug the analysis
  const questionLower = question.toLowerCase();
  
  // Check general keywords
  if (PromptConfig.keywords && PromptConfig.keywords.general) {
    const isGeneralQuestion = PromptConfig.keywords.general.some(keyword => questionLower.includes(keyword));
    console.log(`   🔍 isGeneralQuestion: ${isGeneralQuestion}`);
    console.log(`   🎯 General keywords found: ${PromptConfig.keywords.general.filter(k => questionLower.includes(k))}`);
  } else {
    console.log(`   ❌ No general keywords found in config`);
  }
  
  // Check app-specific keywords  
  if (PromptConfig.keywords && PromptConfig.keywords.application) {
    const isAppRelated = PromptConfig.keywords.application.some(keyword => questionLower.includes(keyword));
    console.log(`   🔍 isAppRelated: ${isAppRelated}`);
    console.log(`   🎯 App keywords found: ${PromptConfig.keywords.application.filter(k => questionLower.includes(k))}`);
  } else {
    console.log(`   ❌ No application keywords found in config`);
  }

  const result = PromptSelector.selectPrompt({
    hasRagContext: true,
    conversationCount: 0,
    question: question,
    contextSources: {
      apiSpec: true,
      rootDocumentation: true,
      moduleDocumentation: true,
      code: true
    },
    mode: 'auto'
  });
  
  // Identify prompt type
  let promptType = 'Unknown';
  if (result.includes('broad expertise across many topics')) promptType = 'General';
  else if (result.includes('comprehensive information about the user\'s application')) promptType = 'RAG';
  else if (result.includes('expert software engineer')) promptType = 'Code Analysis';
  else if (result.includes('API design and documentation')) promptType = 'API Specialist';
  else if (result.includes('software development and general knowledge')) promptType = 'Standard';
  
  console.log(`   ✅ Final selection: ${promptType}`);
});
