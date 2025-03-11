// aiPostgresAdapter.js
'use strict';
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST, // Public IP or Cloud SQL Proxy
  database: 'eventstorm_ai',
  password: process.env.DB_PASSWORD,
  port: 5432,
});

class AIPostgresAdapter {

  async saveGitData(userId, repoId, content) {
    try {
      const query = `
        INSERT INTO git_data (user_id, repo_id, content) 
        VALUES ($1, $2, $3) 
        RETURNING id;
      `;
      const values = [userId, repoId, content];
      const result = await pool.query(query, values);
      console.log(`Git data stored with ID: ${result.rows[0].id}`);
    } catch (error) {
      console.error('Error saving Git data:', error);
      throw error;
    }
  }

  // Save Wiki data
  async saveWikiData(userId, repoId, content) {
    try {
      const query = `
        INSERT INTO wiki_data (user_id, repo_id, content) 
        VALUES ($1, $2, $3) 
        RETURNING id;
      `;
      const values = [userId, repoId, content];
      const result = await pool.query(query, values);
      console.log(`Wiki data stored with ID: ${result.rows[0].id}`);
    } catch (error) {
      console.error('Error saving Wiki data:', error);
      throw error;
    }
  }

  // Save AI-generated response
  async saveAiResponse({ userId, conversationId, repoId, prompt, response }) {
    try {
      const query = `
        INSERT INTO ai_responses (user_id, conversation_id, repo_id, prompt, response) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING id;
      `;
      const values = [userId, conversationId, repoId, prompt, response];
      const result = await pool.query(query, values);
      console.log(`AI response stored with ID: ${result.rows[0].id}`);
    } catch (error) {
      console.error('Error saving AI response:', error);
      throw error;
    }
  }

  // Retrieve AI responses for a conversation
  async getAiResponses(conversationId) {
    try {
      const query = `SELECT * FROM ai_responses WHERE conversation_id = $1 ORDER BY created_at DESC;`;
      const result = await pool.query(query, [conversationId]);
      return result.rows;
    } catch (error) {
      console.error('Error retrieving AI responses:', error);
      throw error;
    }
  }
}

module.exports = AIPostgresAdapter;
