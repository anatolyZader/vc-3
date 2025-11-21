#!/usr/bin/env node
/**
 * Test script for local development authentication
 * Tests the /api/auth/dev-login endpoint
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testDevAuth() {
  console.log('🧪 Testing Local Development Authentication\n');
  
  try {
    // Test 1: Default dev login (no body)
    console.log('1️⃣ Testing default dev login...');
    const response1 = await fetch(`${BASE_URL}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (response1.ok) {
      const data = await response1.json();
      console.log('✅ Default dev login successful');
      console.log(`   User: ${data.user.email} (${data.user.username})`);
      console.log(`   Token: ${data.token.substring(0, 20)}...`);
      
      // Extract the token for subsequent tests
      const token = data.token;
      
      // Test 2: Custom dev login
      console.log('\n2️⃣ Testing custom dev login...');
      const response2 = await fetch(`${BASE_URL}/api/auth/dev-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'custom-dev@localhost.com',
          username: 'CustomDev'
        })
      });
      
      if (response2.ok) {
        const data2 = await response2.json();
        console.log('✅ Custom dev login successful');
        console.log(`   User: ${data2.user.email} (${data2.user.username})`);
      } else {
        console.log('❌ Custom dev login failed:', response2.status);
      }
      
      // Test 3: Token verification (if you have a protected endpoint)
      console.log('\n3️⃣ Testing token verification...');
      const response3 = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response3.ok) {
        const userData = await response3.json();
        console.log('✅ Token verification successful');
        console.log(`   Authenticated as: ${userData.user?.username || 'Unknown'}`);
      } else {
        console.log(`⚠️ Token verification returned status: ${response3.status}`);
        console.log('   (This might be expected if /api/auth/me requires additional setup)');
      }
      
    } else {
      console.log('❌ Default dev login failed:', response1.status);
      const errorText = await response1.text();
      console.log('   Error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('\n💡 Make sure your backend is running on', BASE_URL);
    console.log('   Start it with: cd backend && npm run dev:local');
  }
}

// Run if called directly
if (require.main === module) {
  testDevAuth()
    .then(() => console.log('\n🎉 Dev auth testing complete!'))
    .catch(console.error);
}

module.exports = { testDevAuth };