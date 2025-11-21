#!/usr/bin/env node
/**
 * Test script to verify UL tags are present in retrieved chunks
 */

const axios = require('axios');

async function testULTags() {
  console.log('🧪 Testing UL tags in retrieved chunks...\n');
  
  try {
    const response = await axios.post('http://localhost:3000/api/ai/query', {
      userId: 'd41402df-182a-41ec-8f05-153118bf2718',
      conversationId: 'test-ul-tags-' + Date.now(),
      prompt: 'list all methods in aiService.js',
      history: []
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('✅ Query successful!');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
    // Check server logs
    console.log('\n🔍 Now check the backend logs for UL_DEBUG output:');
    console.log('   tail -50 backend/logs/combined.log | grep "UL_"');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('Stack:', error.stack);
  }
}

testULTags();
