#!/usr/bin/env node

/**
 * Test script to verify the fixed threshold works
 */

require('dotenv').config();

async function testFixedThreshold() {
    try {
        console.log('🔍 Testing RAG system with fixed threshold...');
        
        const response = await fetch('http://localhost:3000/api/chat/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkNDE0MDJkZi0xODJhLTQxZWMtOGYwNS0xNTMxMTZiZjI3MTgiLCJ1c2VybmFtZSI6bnVsbCwiZXhwIjoxNzU5MDE3MzkzLCJpYXQiOjE3NTgxNTMzOTN9.3lEKF7z-3Dv-nN6k5JnfEqaEcXZdtHQ2hvKaYpFx-Ic'
            }
        });
        
        const startData = await response.json();
        console.log('📝 Started conversation:', startData.conversationId);
        
        // Ask the same question
        const questionResponse = await fetch(`http://localhost:3000/api/chat/${startData.conversationId}/question`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkNDE0MDJkZi0xODJhLTQxZWMtOGYwNS0xNTMxMTZiZjI3MTgiLCJ1c2VybmFtZSI6bnVsbCwiZXhwIjoxNzU5MDE3MzkzLCJpYXQiOjE3NTgxNTMzOTN9.3lEKF7z-3Dv-nN6k5JnfEqaEcXZdtHQ2hvKaYpFx-Ic'
            },
            body: JSON.stringify({
                prompt: 'How is event-driven design implemented in eventstorm.me app?'
            })
        });
        
        const questionData = await questionResponse.json();
        console.log('❓ Question submitted:', questionData);
        
        // Wait a few seconds for processing
        console.log('⏳ Waiting for AI response...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Get conversation history to see the response
        const historyResponse = await fetch(`http://localhost:3000/api/chat/${startData.conversationId}`, {
            headers: {
                'Cookie': 'auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkNDE0MDJkZi0xODJhLTQxZWMtOGYwNS0xNTMxMTZiZjI3MTgiLCJ1c2VybmFtZSI6bnVsbCwiZXhwIjoxNzU5MDE3MzkzLCJpYXQiOjE3NTgxNTMzOTN9.3lEKF7z-3Dv-nN6k5JnfEqaEcXZdtHQ2hvKaYpFx-Ic'
            }
        });
        
        const historyData = await historyResponse.json();
        console.log('\n📜 Conversation History:');
        console.log(JSON.stringify(historyData, null, 2));
        
        // Check if we got a contextual response
        const lastMessage = historyData.messages?.[historyData.messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
            const content = lastMessage.content;
            if (content.includes('EventStorm') || content.includes('event-driven') || content.includes('chat module')) {
                console.log('\n✅ SUCCESS: Got contextual response mentioning available content!');
            } else if (content.includes("I don't have specific details")) {
                console.log('\n❌ STILL FAILING: Got generic response - threshold still too high or no content found');
            } else {
                console.log('\n🤔 UNKNOWN: Response content unclear:', content.substring(0, 200));
            }
        } else {
            console.log('\n❌ No AI response found in conversation');
        }
        
    } catch (error) {
        console.error('❌ Error testing threshold fix:', error);
    }
}

testFixedThreshold().catch(console.error);