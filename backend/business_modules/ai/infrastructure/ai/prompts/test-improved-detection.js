// Quick test for the improved keyword detection
const PromptConfig = require('./promptConfig');

console.log('🧪 Testing improved keyword detection...\n');

const testQuestions = [
  'tell me the history of Earth',
  'what is quantum physics?', 
  'what is the main technical difference between aop and business modules in eventstorm.me app?',
  'how does the eventstorm application work?',
  'explain the architecture of this app',
  'debug this function in my app'
];

testQuestions.forEach(prompt => {
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
  
  console.log(`❓ "${prompt}"`);
  console.log(`   🔍 hasGeneral=${hasGeneralPattern}, hasApp=${hasApplicationKeywords}, mentionsApp=${mentionsApp}`);
  console.log(`   ✅ Result: ${isGeneralQuestion ? 'General Knowledge' : 'Application/Technical'}\n`);
});
