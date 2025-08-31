// aiPostgresAdapter.js
'use strict';
const { Pool } = require('pg');
const IAIPersistPort = require('../../domain/ports/IAIPersistPort');

const isLocal = process.env.NODE_ENV !== 'staging';

class AIPostgresAdapter extends IAIPersistPort {
  constructor({ cloudSqlConnector }) {
      super();
      this.connector = cloudSqlConnector;
      this.pool = null;
      this.poolPromise = isLocal
          ? this.createLocalPool()
          : this.createCloudSqlPool(cloudSqlConnector);
      
      // Initialize the pool early to catch any setup problems
      this.initPool().catch(err => {
          console.error('❌ Failed to initialize database pool:', err);
      });
  }

  async initPool() {
      try {
          this.pool = await this.poolPromise;
          console.log('✅ Database pool initialized successfully');
          return this.pool;
      } catch (error) {
          console.error('❌ Error initializing database pool:', error);
          throw error;
      }
  }

  async getPool() {
      if (!this.pool) {
          try {
              this.pool = await this.poolPromise;
          } catch (error) {
              console.error('❌ Failed to get pool:', error);
              throw new Error(`Database connection error: ${error.message}`);
          }
      }
      return this.pool;
  }

  createLocalPool() {
      const config = {
          user: process.env.PG_USER || 'postgres',
          password: process.env.PG_PASSWORD || '111',
          database: process.env.PG_DATABASE || 'eventstorm_db',
          host: 'localhost',
          port: 5432,
      };
      return Promise.resolve(new Pool(config));
  }

  async createCloudSqlPool(connector) {
      try {
          const instanceConnectionName = process.env.CLOUD_SQL_CONNECTION_NAME;
          if (!instanceConnectionName) {
              throw new Error('❌ CLOUD_SQL_CONNECTION_NAME environment variable is not set. Cannot connect to Cloud SQL.');
          }

          const clientOpts = await connector.getOptions({
              instanceConnectionName,
              ipType: 'PRIVATE',
              authType: 'ADC',
          });

          const config = {
              ...clientOpts,
              user: process.env.PG_USER,
              password: process.env.PG_PASSWORD,
              database: process.env.PG_DATABASE,
          };

          console.info('[DB] Using Cloud SQL config (AI) for:', instanceConnectionName);
          return new Pool(config);
      } catch (error) {
          console.error('❌ Error creating Cloud SQL pool:', error);
          throw error;
      }
  }

  async saveGitData(userId, repoId, content) {
    try {
      const pool = await this.getPool(); // Get initialized pool
      const client = await pool.connect();
      try {
        const query = `
          INSERT INTO git_data (user_id, repo_id, content)
          VALUES ($1, $2, $3)
          RETURNING id;
        `;
        const values = [userId, repoId, content];
        const result = await client.query(query, values);
        console.log(`Git data stored with ID: ${result.rows[0].id}`);
        return result.rows[0].id;
      } catch (error) {
        console.error('Error saving Git data:', error);
        throw error;
      } finally {
        client.release();
      }
    } catch (poolError) {
      console.error('Database connection error in saveGitData:', poolError);
      // Return a default value instead of throwing
      return null;
    }
  }

  // Save Docs data
  async saveDocsData(userId, repoId, content) {
    try {
      const pool = await this.getPool(); // Get initialized pool
      const client = await pool.connect();
      try {
        const query = `
          INSERT INTO docs_data (user_id, repo_id, content)
          VALUES ($1, $2, $3)
          RETURNING id;
        `;
        const values = [userId, repoId, content];
        const result = await client.query(query, values);
        console.log(`Docs data stored with ID: ${result.rows[0].id}`);
        return result.rows[0].id;
      } catch (error) {
        console.error('Error saving Docs data:', error);
        throw error;
      } finally {
        client.release();
      }
    } catch (poolError) {
      console.error('Database connection error in saveDocsData:', poolError);
      // Return a default value instead of throwing
      return null;
    }
  }

  // Save AI-generated response
  async saveAiResponse({ userId, conversationId, repoId, prompt, response }) {
    try {
      const pool = await this.getPool(); // Get initialized pool
      const client = await pool.connect();
      try {
        const query = `
          INSERT INTO ai.ai_responses (user_id, conversation_id, repo_id, prompt, response)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id;
        `;
        const values = [userId, conversationId, repoId, prompt, response];
        const result = await client.query(query, values);
        console.log(`AI response stored with ID: ${result.rows[0].id}`);
        return result.rows[0].id;
      } catch (error) {
        console.error('Error saving AI response:', error);
        throw error;
      } finally {
        client.release();
      }
    } catch (poolError) {
      console.error('Database connection error in saveAiResponse:', poolError);
      // Return a default value instead of throwing
      return null;
    }
  }

  // Retrieve AI responses for a conversation
  async getAiResponses(conversationId) {
    try {
      const pool = await this.getPool(); // Get initialized pool
      const client = await pool.connect();
      try {
        const query = `SELECT * FROM ai.ai_responses WHERE conversation_id = $1 ORDER BY created_at DESC;`;
        const result = await client.query(query, [conversationId]);
        return result.rows;
      } catch (error) {
        console.error('Error retrieving AI responses:', error);
        throw error;
      } finally {
        client.release();
      }
    } catch (poolError) {
      console.error('Database connection error in getAiResponses:', poolError);
      // Return empty array instead of throwing
      return [];
    }
  }

  // Retrieve conversation history for context (ordered chronologically)
  async getConversationHistory(conversationId, limit = 10) {
    try {
      const pool = await this.getPool(); // Get initialized pool
      const client = await pool.connect();
      try {
        const query = `
          SELECT prompt, response, created_at 
          FROM ai.ai_responses 
          WHERE conversation_id = $1 
          ORDER BY created_at ASC 
          LIMIT $2;
        `;
        const result = await client.query(query, [conversationId, limit]);
        return result.rows.map(row => ({
          prompt: row.prompt,
          response: row.response,
          timestamp: row.created_at
        }));
      } catch (error) {
        console.error('Error retrieving conversation history:', error);
        throw error;
      } finally {
        client.release();
      }
    } catch (poolError) {
      console.error('Database connection error in getConversationHistory:', poolError);
      // Return empty array instead of throwing
      return [];
    }
  }
}

module.exports = AIPostgresAdapter;