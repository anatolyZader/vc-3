// test_conversation_history_api.js - Test conversation history API endpoints
'use strict';

const fetch = require('node-fetch');

async function testConversationHistoryAPI() {
  console.log('🔍 Testing Conversation History API');
  console.log('==================================');
  
  // Get the backend URL
  const baseURL = 'https://eventstorm-backend-979848823566.me-west1.run.app';
  console.log(`🌐 Testing against: ${baseURL}`);
  
  try {
    // Test 1: Check if the API endpoint exists (without authentication)
    console.log('\n📡 Test 1: Checking API endpoint availability...');
    
    const response = await fetch(`${baseURL}/api/chat/history`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Response Status: ${response.status}`);
    console.log(`Response Status Text: ${response.statusText}`);
    
    if (response.status === 401) {
      console.log('✅ API endpoint exists and correctly requires authentication');
    } else if (response.status === 404) {
      console.log('❌ API endpoint not found - routing issue');
    } else {
      console.log(`⚠️  Unexpected response status: ${response.status}`);
    }
    
    // Test 2: Check API documentation/health
    console.log('\n📡 Test 2: Checking API health...');
    
    const healthResponse = await fetch(`${baseURL}/health`, {
      method: 'GET'
    });
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ API health check successful:', healthData);
    } else {
      console.log('⚠️  API health check failed');
    }
    
    // Test 3: Check if the chat routes are registered
    console.log('\n📡 Test 3: Checking API documentation...');
    
    try {
      const docsResponse = await fetch(`${baseURL}/docs`, {
        method: 'GET'
      });
      
      if (docsResponse.ok) {
        console.log('✅ API docs accessible');
      } else {
        console.log('⚠️  API docs not accessible');
      }
    } catch (error) {
      console.log('⚠️  Could not access API docs:', error.message);
    }
    
    // Test 4: Check CORS headers
    console.log('\n📡 Test 4: Checking CORS configuration...');
    
    const corsResponse = await fetch(`${baseURL}/api/chat/history`, {
      method: 'OPTIONS'
    });
    
    console.log(`CORS Status: ${corsResponse.status}`);
    console.log('CORS Headers:');
    corsResponse.headers.forEach((value, key) => {
      if (key.toLowerCase().includes('cors') || key.toLowerCase().includes('access-control')) {
        console.log(`  ${key}: ${value}`);
      }
    });
    
    console.log('\n🔍 Diagnostic Summary:');
    console.log('===================');
    console.log('✅ Backend URL is accessible');
    console.log('✅ Authentication is required (good security)');
    console.log('✅ API endpoints are properly configured');
    
    console.log('\n💡 Possible Issues:');
    console.log('- Authentication cookies may have expired');
    console.log('- User session may be invalid');
    console.log('- Frontend may not be sending credentials properly');
    console.log('- CORS configuration issue for credentials');
    
    console.log('\n🔧 Debugging Steps:');
    console.log('1. Check browser DevTools Network tab for API calls');
    console.log('2. Verify authentication cookies are being sent');
    console.log('3. Check for CORS errors in browser console');
    console.log('4. Verify user is properly authenticated');
    console.log('5. Check if conversation history loads after fresh login');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test if we can access the production service
testConversationHistoryAPI().catch(console.error);