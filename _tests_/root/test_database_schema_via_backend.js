// test_database_schema_via_backend.js
'use strict';

/**
 * Test script to check database schema via the running backend application
 * This uses the existing backend API to access the database through established connections
 */

const fetch = require('node-fetch');

async function testDatabaseSchemaViBackend() {
  console.log('🔍 Testing Database Schema via Backend API');
  console.log('==========================================\n');

  const baseUrl = 'http://localhost:3000';
  
  try {
    // First, let's check if the backend is running
    console.log('🔌 Checking if backend is running...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    if (healthResponse.ok) {
      console.log('✅ Backend is running');
    } else {
      console.log('⚠️  Backend health check returned:', healthResponse.status);
    }
  } catch (error) {
    console.log('❌ Backend is not running or not accessible:', error.message);
    console.log('💡 Please make sure the backend is running on port 3000');
    return;
  }

  try {
    // Try to access some existing API endpoint that uses the database
    console.log('\n🔍 Testing existing database endpoints...');
    
    // Test if we can access any of the existing endpoints
    const endpoints = [
      '/api/ai/capabilities',
      '/api/docs',
      '/health'
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`  Testing ${endpoint}...`);
        const response = await fetch(`${baseUrl}${endpoint}`);
        console.log(`    Status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.text();
          console.log(`    Response length: ${data.length} characters`);
        }
      } catch (error) {
        console.log(`    Error: ${error.message}`);
      }
    }

    console.log('\n💡 To check the database schema properly, we need to either:');
    console.log('1. Add a temporary debug endpoint to the backend');
    console.log('2. Use the existing database test scripts');
    console.log('3. Access the database through the running backend process');
    
    console.log('\n📝 Suggested next steps:');
    console.log('- We can create a simple script that uses the existing database adapters');
    console.log('- Or check if there are existing test files that show database structure');

  } catch (error) {
    console.error('❌ Error testing backend endpoints:', error.message);
  }
}

// Check if node-fetch is available, if not provide instructions
async function checkDependencies() {
  try {
    require('node-fetch');
    return true;
  } catch (error) {
    console.log('❌ node-fetch not found. Installing...');
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
      exec('npm install node-fetch', (error, stdout, stderr) => {
        if (error) {
          console.log('Failed to install node-fetch. Please run: npm install node-fetch');
          resolve(false);
        } else {
          console.log('✅ node-fetch installed');
          resolve(true);
        }
      });
    });
  }
}

// Run the test
async function main() {
  const depsOk = await checkDependencies();
  if (depsOk) {
    await testDatabaseSchemaViBackend();
  }
}

main().catch(console.error);