#!/usr/bin/env node
// test_conversation_debug.js - Debug conversation history functionality
'use strict';

const { createContainer, asClass, asValue } = require('awilix');
const AILangchainAdapter = require('./business_modules/ai/infrastructure/ai/aiLangchainAdapter');
const AIPostgresAdapter = require('./business_modules/ai/infrastructure/persistence/aiPostgresAdapter');

async function testConversationHistory() {
  try {
    console.log('🔍 Testing conversation history functionality...\n');
    
    // Create DI container
    const container = createContainer();
    
    // Register persistence adapter
    container.register({
      aiPostgresAdapter: asClass(AIPostgresAdapter),
      aiProvider: asValue('anthropic')
    });
    
    // Create AI adapter with persistence
    const aiPersistAdapter = container.resolve('aiPostgresAdapter');
    console.log('✅ AI Persist Adapter created:', !!aiPersistAdapter);
    
    const aiAdapter = new AILangchainAdapter({
      aiProvider: 'anthropic',
      aiPersistAdapter: aiPersistAdapter
    });
    
    console.log('✅ AI Langchain Adapter created with persistence adapter');
    
    // Test conversation history retrieval
    const testConversationId = 'test-conversation-123';
    console.log(`\n🧪 Testing getConversationHistory with conversationId: ${testConversationId}`);
    
    try {
      const history = await aiAdapter.getConversationHistory(testConversationId, 5);
      console.log('✅ Conversation history retrieved successfully:', JSON.stringify(history, null, 2));
      
      if (history && history.length > 0) {
        console.log('✅ Conversation history contains data - functionality is working!');
      } else {
        console.log('⚠️  Conversation history is empty - this is expected if no data exists for this conversation ID');
      }
    } catch (historyError) {
      console.error('❌ Error retrieving conversation history:', historyError);
      
      if (historyError.message.includes('does not exist') || historyError.message.includes('table')) {
        console.log('\n🔧 DIAGNOSIS: The ai_responses table likely doesn\'t exist in the database');
        console.log('   This is probably why conversation history is not working in the app');
      }
    }
    
    // Test database connection
    console.log('\n🔌 Testing database connection...');
    try {
      const pool = await aiPersistAdapter.getPool();
      console.log('✅ Database pool connection successful');
      
      // Test if ai schema exists
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT schema_name 
          FROM information_schema.schemata 
          WHERE schema_name = 'ai'
        `);
        
        if (result.rows.length > 0) {
          console.log('✅ AI schema exists in database');
          
          // Test if ai_responses table exists
          const tableResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'ai' AND table_name = 'ai_responses'
          `);
          
          if (tableResult.rows.length > 0) {
            console.log('✅ ai_responses table exists');
            
            // Check table structure
            const structureResult = await client.query(`
              SELECT column_name, data_type 
              FROM information_schema.columns 
              WHERE table_schema = 'ai' AND table_name = 'ai_responses'
              ORDER BY ordinal_position
            `);
            
            console.log('📋 ai_responses table structure:');
            structureResult.rows.forEach(row => {
              console.log(`   - ${row.column_name}: ${row.data_type}`);
            });
            
          } else {
            console.log('❌ ai_responses table does NOT exist');
            console.log('   This explains why conversation history is not working!');
          }
          
        } else {
          console.log('❌ AI schema does NOT exist in database');
          console.log('   This explains why conversation history is not working!');
        }
        
      } finally {
        client.release();
      }
      
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError.message);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testConversationHistory();
