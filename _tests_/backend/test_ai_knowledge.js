#!/usr/bin/env node

/**
 * Test VibeSwitch AI Chat
 * Tests if AI can now access VibeSwitch implementation details
 */

require('dotenv').config();

async function testVibeSwitchAI() {
  console.log('🧪 TESTING VIBESWITCH AI KNOWLEDGE');
  console.log('=' .repeat(50));
  
  const testQueries = [
    "What is the role of logPlugin.js file in vibeswitch.me app?",
    "How is dependency injection implemented in VibeSwitch modules?",
    "What does diPlugin.js do in the VibeSwitch backend?",
    "Explain the purpose of fastify plugins in VibeSwitch",
  ];
  
  for (const query of testQueries) {
    console.log(`\n🔍 TESTING: "${query}"`);
    console.log('-'.repeat(60));
    
    try {
      const response = await fetch('https://vibeswitch.me/api/ai/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'authToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkNDE0MDJkZi0xODJhLTQxZWMtOGYwNS0xNTMxMThiZjI3MTgiLCJlbWFpbCI6Im15emFkZXJAZ21haWwuY29tIiwiaWF0IjoxNzI3NDI1MTY4LCJleHAiOjE3Mjc0Mjg3Njh9.w-G0iEaRrvJCpKQWUbQWUJVFKGAuYjbj8XYtJQBaRgI'
        },
        body: JSON.stringify({
          prompt: query,
          conversationId: 'test-' + Date.now()
        })
      });
      
      if (!response.ok) {
        console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        continue;
      }
      
      const result = await response.json();
      const message = result.message || result.content || 'No response content';
      
      // Check if response contains VibeSwitch-specific details
      const hasSpecificDetails = [
        'logPlugin', 'diPlugin', 'fastify', 'vibeswitch', 'backend',
        'aop_modules', 'business_modules', 'infrastructure'
      ].some(keyword => message.toLowerCase().includes(keyword));
      
      if (hasSpecificDetails) {
        console.log('✅ SPECIFIC RESPONSE (has VibeSwitch details)');
        console.log(message.substring(0, 200) + '...');
      } else {
        console.log('❌ GENERIC RESPONSE (no VibeSwitch details)');
        console.log(message.substring(0, 200) + '...');
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 SUMMARY:');
  console.log('If responses are still generic, repository processing is not complete.');
  console.log('If responses contain VibeSwitch-specific details, the fix worked!');
}

if (require.main === module) {
  testVibeSwitchAI();
}

module.exports = testVibeSwitchAI;