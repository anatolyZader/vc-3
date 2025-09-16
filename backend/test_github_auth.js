#!/usr/bin/env node
require('dotenv').config();
const https = require('https');

console.log('🔍 Testing GitHub Token Authentication...');

const token = process.env.GITHUB_TOKEN;

if (!token) {
  console.log('❌ No GITHUB_TOKEN found in environment');
  process.exit(1);
}

console.log(`✅ Token found: ${token.substring(0, 20)}...`);
console.log(`📏 Token length: ${token.length} characters`);
console.log(`🔧 Token type: ${token.startsWith('ghp_') ? 'Classic' : token.startsWith('github_pat_') ? 'Fine-grained' : 'Unknown'}`);

// Test GitHub API authentication
const options = {
  hostname: 'api.github.com',
  path: '/user',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'User-Agent': 'eventstorm-auth-test',
    'Accept': 'application/vnd.github.v3+json'
  }
};

console.log('\n🌐 Testing API authentication...');

const req = https.request(options, (res) => {
  console.log(`📊 Response Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      if (res.statusCode === 200) {
        const user = JSON.parse(data);
        console.log('✅ Authentication SUCCESSFUL!');
        console.log(`👤 User: ${user.login}`);
        console.log(`📧 Email: ${user.email || 'Not provided'}`);
        console.log(`🏢 Company: ${user.company || 'Not provided'}`);
        console.log('\n🎉 GitHub token is working correctly!');
      } else {
        console.log('❌ Authentication FAILED!');
        console.log(`💬 Response: ${data}`);
      }
    } catch (error) {
      console.log('❌ Error parsing response:', error.message);
      console.log(`💬 Raw response: ${data}`);
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Request error:', error.message);
});

req.end();