// test_authenticated_search.js
'use strict';

/**
 * Test script that logs in and tests the text search endpoints
 * This script will:
 * 1. Login to get a valid JWT token
 * 2. Test all the search endpoints with authentication
 * 3. Check if the search services are properly initialized
 */

const baseUrl = 'http://localhost:3000';

// Test credentials (you may need to create a test user first)
const testCredentials = {
  email: 'test@example.com',
  password: 'testpassword123'
};

async function loginAndGetToken() {
  console.log('🔐 Attempting to login...');
  
  try {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify(testCredentials)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Login successful:', data.message);
      console.log('👤 User:', data.user);
      
      // Extract token from cookies
      const cookies = response.headers.get('set-cookie');
      if (cookies) {
        const tokenMatch = cookies.match(/authToken=([^;]+)/);
        return tokenMatch ? tokenMatch[1] : null;
      }
      
      return null;
    } else {
      const error = await response.text();
      console.log('❌ Login failed:', response.status, error);
      
      if (response.status === 401) {
        console.log('💡 Please create a test user first or check credentials');
        console.log('💡 You can register via: POST /api/auth/register');
      }
      
      return null;
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return null;
  }
}

async function registerTestUser() {
  console.log('👤 Creating test user...');
  
  try {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'testuser',
        email: testCredentials.email,
        password: testCredentials.password
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Test user created:', data.message);
      return true;
    } else {
      const error = await response.text();
      console.log('⚠️  User creation response:', response.status, error);
      return false;
    }
  } catch (error) {
    console.error('❌ User creation error:', error.message);
    return false;
  }
}

async function testSearchWithAuth(token) {
  console.log('\n🔍 Testing search endpoints with authentication...');
  
  const headers = {
    'Content-Type': 'application/json',
    'Cookie': `authToken=${token}`
  };

  // Test 1: Search capabilities
  console.log('\n📊 Testing search capabilities...');
  try {
    const response = await fetch(`${baseUrl}/api/ai/search/capabilities`, {
      method: 'GET',
      headers,
      credentials: 'include'
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Search capabilities:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.log('❌ Capabilities error:', error);
    }
  } catch (error) {
    console.error('❌ Capabilities test failed:', error.message);
  }

  // Test 2: Text search
  console.log('\n🔍 Testing text search...');
  try {
    const response = await fetch(`${baseUrl}/api/ai/search/text?query=function&limit=3`, {
      method: 'GET',
      headers,
      credentials: 'include'
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Text search results:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.log('❌ Text search error:', error);
    }
  } catch (error) {
    console.error('❌ Text search test failed:', error.message);
  }

  // Test 3: Hybrid search
  console.log('\n🔄 Testing hybrid search...');
  try {
    const response = await fetch(`${baseUrl}/api/ai/search/hybrid?query=function&limit=3&includeText=true&includeVector=false`, {
      method: 'GET',
      headers,
      credentials: 'include'
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Hybrid search results:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.log('❌ Hybrid search error:', error);
    }
  } catch (error) {
    console.error('❌ Hybrid search test failed:', error.message);
  }

  // Test 4: Search systems test
  console.log('\n🧪 Testing search systems test endpoint...');
  try {
    const response = await fetch(`${baseUrl}/api/ai/search/test`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ testQuery: 'function' })
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Search systems test results:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.log('❌ Search systems test error:', error);
    }
  } catch (error) {
    console.error('❌ Search systems test failed:', error.message);
  }
}

async function main() {
  console.log('🧪 Testing Text Search with Authentication');
  console.log('=========================================\n');

  // Try to login first
  let token = await loginAndGetToken();
  
  // If login failed, try to create a test user
  if (!token) {
    console.log('\n🔄 Login failed, attempting to create test user...');
    const userCreated = await registerTestUser();
    
    if (userCreated) {
      // Try to login again
      await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
      token = await loginAndGetToken();
    }
  }

  if (token) {
    console.log('🎯 Authentication successful, testing search endpoints...');
    await testSearchWithAuth(token);
  } else {
    console.log('\n❌ Could not authenticate - unable to test search endpoints');
    console.log('💡 Please manually create a test user or check server logs');
  }

  console.log('\n📋 Test Complete');
}

// Run the test
main().catch(console.error);