#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function testGitHubAPI() {
    const token = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
    
    console.log('🔑 Testing GitHub token:', token ? `${token.substring(0, 10)}...` : 'NOT FOUND');
    
    try {
        const response = await axios.get('https://api.github.com/rate_limit', {
            headers: {
                'Authorization': `token ${token}`,
                'User-Agent': 'EventStorm-App'
            }
        });
        
        console.log('✅ Rate limit status:');
        console.log('  Core:', response.data.resources.core);
        console.log('  Search:', response.data.resources.search);
        console.log('  GraphQL:', response.data.resources.graphql);
        
        const resetTime = new Date(response.data.resources.core.reset * 1000);
        console.log('  Reset time:', resetTime.toISOString());
        
    } catch (error) {
        if (error.response) {
            console.log('❌ API Error:', error.response.status, error.response.data);
        } else {
            console.error('❌ Request failed:', error.message);
        }
    }
}

testGitHubAPI();