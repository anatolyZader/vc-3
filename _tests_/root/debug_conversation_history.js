// debug_conversation_history.js - Debug conversation history issue
'use strict';

const { Pool } = require('pg');

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection and Conversations History');
  console.log('=====================================================');
  
  // Database configuration
  const dbConfig = {
    user: process.env.PG_USER || 'postgres',
    host: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
    database: process.env.PG_DATABASE || 'eventstorm_db',
    password: process.env.PG_PASSWORD,
    port: 5432,
  };
  
  console.log('📊 Database Config:');
  console.log(`  User: ${dbConfig.user}`);
  console.log(`  Host: ${dbConfig.host}`);
  console.log(`  Database: ${dbConfig.database}`);
  console.log(`  Password: ${dbConfig.password ? '[SET]' : '[NOT SET]'}`);
  
  let pool;
  let client;
  
  try {
    // Test connection
    console.log('\n🔌 Testing database connection...');
    pool = new Pool(dbConfig);
    client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Test basic query
    console.log('\n📋 Testing basic query...');
    const basicResult = await client.query('SELECT NOW() as current_time');
    console.log('✅ Basic query successful:', basicResult.rows[0].current_time);
    
    // Check if chat schema exists
    console.log('\n📝 Checking chat schema...');
    const schemaResult = await client.query(`
      SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'chat'
    `);
    
    if (schemaResult.rows.length > 0) {
      console.log('✅ Chat schema exists');
      
      // Check if conversations table exists
      console.log('\n📋 Checking conversations table...');
      const tableResult = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'chat' AND table_name = 'conversations'
      `);
      
      if (tableResult.rows.length > 0) {
        console.log('✅ Conversations table exists');
        
        // Check table structure
        console.log('\n🏗️  Checking table structure...');
        const structureResult = await client.query(`
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_schema = 'chat' AND table_name = 'conversations' 
          ORDER BY ordinal_position
        `);
        
        console.log('📊 Table structure:');
        structureResult.rows.forEach(col => {
          console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
        });
        
        // Count total conversations
        console.log('\n📊 Counting total conversations...');
        const countResult = await client.query('SELECT COUNT(*) as total FROM chat.conversations');
        console.log(`✅ Total conversations in database: ${countResult.rows[0].total}`);
        
        // Get recent conversations (last 10)
        console.log('\n📚 Getting recent conversations...');
        const recentResult = await client.query(`
          SELECT id, title, user_id, created_at 
          FROM chat.conversations 
          ORDER BY created_at DESC 
          LIMIT 10
        `);
        
        console.log(`✅ Recent conversations (${recentResult.rows.length}):`);
        recentResult.rows.forEach((conv, index) => {
          console.log(`  ${index + 1}. ID: ${conv.id}, User: ${conv.user_id}, Title: ${conv.title}, Created: ${conv.created_at}`);
        });
        
        // Test the exact query used by fetchConversationsHistory
        console.log('\n🔍 Testing fetchConversationsHistory query...');
        const testUserId = recentResult.rows[0]?.user_id; // Use first user found
        
        if (testUserId) {
          console.log(`📋 Testing with user ID: ${testUserId}`);
          const historyResult = await client.query(`
            SELECT 
              id as "conversationId", 
              title, 
              created_at as "createdAt",
              created_at as "updatedAt"
            FROM chat.conversations 
            WHERE user_id = $1 
            ORDER BY created_at DESC
          `, [testUserId]);
          
          console.log(`✅ History query returned ${historyResult.rows.length} conversations for user ${testUserId}`);
          historyResult.rows.forEach((conv, index) => {
            console.log(`  ${index + 1}. ${conv.conversationId}: ${conv.title} (${conv.createdAt})`);
          });
          
        } else {
          console.log('⚠️  No conversations found to test with');
        }
        
      } else {
        console.log('❌ Conversations table does not exist');
      }
      
    } else {
      console.log('❌ Chat schema does not exist');
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    if (client) {
      client.release();
      console.log('🔌 Database client released');
    }
    if (pool) {
      await pool.end();
      console.log('🔌 Database pool closed');
    }
  }
}

// Load environment variables from .env file for local testing
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Run the test
testDatabaseConnection().catch(console.error);