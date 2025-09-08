#!/usr/bin/env node
// test_database_schema.js - Check database schema for conversation history
'use strict';

const { Pool } = require('pg');

async function testDatabaseSchema() {
  let pool = null;
  
  try {
    console.log('🔍 Testing database schema for conversation history...\n');
    
    // Create database connection
    const config = {
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || '111',
      database: process.env.PG_DATABASE || 'eventstorm_db',
      host: 'localhost',
      port: 5432,
    };
    
    pool = new Pool(config);
    console.log('✅ Database pool created');
    
    const client = await pool.connect();
    console.log('✅ Database connection established');
    
    try {
      // Check if ai schema exists
      console.log('\n🔍 Checking for AI schema...');
      const schemaResult = await client.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = 'ai'
      `);
      
      if (schemaResult.rows.length > 0) {
        console.log('✅ AI schema exists in database');
        
        // Check if ai_responses table exists
        console.log('\n🔍 Checking for ai_responses table...');
        const tableResult = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'ai' AND table_name = 'ai_responses'
        `);
        
        if (tableResult.rows.length > 0) {
          console.log('✅ ai_responses table exists');
          
          // Check table structure
          console.log('\n📋 ai_responses table structure:');
          const structureResult = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'ai' AND table_name = 'ai_responses'
            ORDER BY ordinal_position
          `);
          
          structureResult.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
          });
          
          // Check if table has any data
          const countResult = await client.query(`
            SELECT COUNT(*) as count FROM ai.ai_responses
          `);
          
          console.log(`\n📊 ai_responses table contains ${countResult.rows[0].count} records`);
          
          if (countResult.rows[0].count > 0) {
            // Show sample data
            const sampleResult = await client.query(`
              SELECT conversation_id, prompt, response, created_at
              FROM ai.ai_responses 
              ORDER BY created_at DESC 
              LIMIT 3
            `);
            
            console.log('\n🔍 Sample records:');
            sampleResult.rows.forEach((row, i) => {
              console.log(`   ${i+1}. ConversationID: ${row.conversation_id}`);
              console.log(`      Prompt: ${row.prompt ? row.prompt.substring(0, 50) + '...' : 'null'}`);
              console.log(`      Response: ${row.response ? row.response.substring(0, 50) + '...' : 'null'}`);
              console.log(`      Created: ${row.created_at}`);
              console.log();
            });
          }
          
          console.log('\n✅ CONCLUSION: Database schema is correct for conversation history!');
          console.log('   The issue might be elsewhere in the conversation ID flow.');
          
        } else {
          console.log('❌ ai_responses table does NOT exist');
          console.log('\n🔧 SOLUTION NEEDED: Create the ai_responses table');
          
          console.log('\nSQL to create the table:');
          console.log(`
CREATE SCHEMA IF NOT EXISTS ai;

CREATE TABLE IF NOT EXISTS ai.ai_responses (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    conversation_id VARCHAR(255) NOT NULL,
    prompt TEXT,
    response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_id, conversation_id, created_at)
);`);
        }
        
      } else {
        console.log('❌ AI schema does NOT exist in database');
        console.log('\n🔧 SOLUTION NEEDED: Create the AI schema and ai_responses table');
      }
      
    } finally {
      client.release();
    }
    
    console.log('\n✅ Database schema check completed');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 DIAGNOSIS: Cannot connect to PostgreSQL database');
      console.log('   Make sure PostgreSQL is running on localhost:5432');
      console.log('   Or check the connection settings');
    }
    
  } finally {
    if (pool) {
      await pool.end();
    }
  }
  
  process.exit(0);
}

testDatabaseSchema();
