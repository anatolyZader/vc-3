#!/usr/bin/env node

// Test script to verify conversation history functionality
const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const conversationId = 'test-conversation-' + Date.now();

// Mock user token - replace with actual token if auth is required
const mockToken = 'your-auth-token-here';

async function testConversationHistory() {
  console.log('🧪 Testing Conversation History Functionality');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Send first message
    console.log('\n📝 Step 1: Sending first message...');
    const firstMessage = 'Hello, my name is Alice and I like programming.';
    
    const firstResponse = await axios.post(
      `${API_BASE}/api/chat/${conversationId}/question`,
      { prompt: firstMessage },
      {
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('✅ First message sent successfully');
    
    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test 2: Send second message referencing first
    console.log('\n📝 Step 2: Sending second message that references the first...');
    const secondMessage = 'What did I just tell you my name was?';
    
    const secondResponse = await axios.post(
      `${API_BASE}/api/chat/${conversationId}/question`,
      { prompt: secondMessage },
      {
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('✅ Second message sent successfully');
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Test 3: Fetch conversation to see the AI's responses
    console.log('\n📝 Step 3: Fetching conversation to see AI responses...');
    const conversationResponse = await axios.get(
      `${API_BASE}/api/chat/${conversationId}`,
      {
        headers: {
          'Authorization': `Bearer ${mockToken}`
        },
        timeout: 10000
      }
    );
    
    const messages = conversationResponse.data;
    console.log('\n💬 Conversation Messages:');
    console.log('=' .repeat(30));
    
    messages.forEach((msg, index) => {
      console.log(`${index + 1}. [${msg.role}]: ${msg.content.substring(0, 100)}...`);
    });
    
    // Check if AI mentioned "Alice" in the second response
    const aiResponses = messages.filter(msg => msg.role === 'assistant');
    if (aiResponses.length >= 2) {
      const secondAiResponse = aiResponses[1].content.toLowerCase();
      if (secondAiResponse.includes('alice')) {
        console.log('\n🎉 SUCCESS: AI remembered the name "Alice" from the first message!');
        console.log('✅ Conversation history is working correctly.');
      } else {
        console.log('\n❌ FAILURE: AI did not remember the name from the first message.');
        console.log('❌ Conversation history may not be working properly.');
      }
    } else {
      console.log('\n⚠️  WARNING: Not enough AI responses to test memory.');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testConversationHistory();
