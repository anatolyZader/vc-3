#!/usr/bin/env node

/**
 * Test EventStorm AI Chat
 * Tests if AI can now access EventStorm implementation details
 */

require('dotenv').config();

async function testEventStormAI() {
  console.log('🧪 TESTING EVENTSTORM AI KNOWLEDGE');
  console.log('=' .repeat(50));
  
  const testQueries = [
    "What is the role of logPlugin.js file in eventstorm.me app?",
    "How is dependency injection implemented in EventStorm modules?",
    "What does diPlugin.js do in the EventStorm backend?",
    "Explain the purpose of fastify plugins in EventStorm",
  ];
  
  for (const query of testQueries) {
    console.log(`\n🔍 TESTING: "${query}"`);
    console.log('-'.repeat(60));
    
    try {
      const response = await fetch('https://eventstorm.me/api/ai/respond', {
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
      
      // Check if response contains EventStorm-specific details
      const hasSpecificDetails = [
        'logPlugin', 'diPlugin', 'fastify', 'eventstorm', 'backend',
        'aop_modules', 'business_modules', 'infrastructure'
      ].some(keyword => message.toLowerCase().includes(keyword));
      
      if (hasSpecificDetails) {
        console.log('✅ SPECIFIC RESPONSE (has EventStorm details)');
        console.log(message.substring(0, 200) + '...');
      } else {
        console.log('❌ GENERIC RESPONSE (no EventStorm details)');
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
  console.log('If responses contain EventStorm-specific details, the fix worked!');
}

if (require.main === module) {
  testEventStormAI();
}

module.exports = testEventStormAI;