// aiPostgresAdapter.js
'use strict';
const { Pool } = require('pg');
const IAIPersistPort = require('../../domain/ports/IAIPersistPort');

const isLocal = process.env.NODE_ENV !== 'staging';

class AIPostgresAdapter extends IAIPersistPort{
  constructor({ cloudSqlConnector }) {
      super();
      this.connector = cloudSqlConnector;
      this.pool = null;
      this.poolPromise = isLocal
          ? this.createLocalPool()
          : this.createCloudSqlPool(cloudSqlConnector);
  }

  async getPool() {
      if (!this.pool) {
          this.pool = await this.poolPromise;
      }
      return this.pool;
  }

  createLocalPool() {
      const config = {
          user: process.env.PG_USER,
          password: process.env.PG_PASSWORD,
          database: process.env.PG_DATABASE,
          host: 'localhost',
          port: 5432,
      };
      console.info('[DB] Using local Postgres config (AI):', config);
      return Promise.resolve(new Pool(config));
  }

  async createCloudSqlPool(connector) {
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
  }
  

  async saveGitData(userId, repoId, content) {
    const client = await this.pool.connect(); // Acquire a client from the pool
    try {
      const query = `
        INSERT INTO git_data (user_id, repo_id, content)
        VALUES ($1, $2, $3)
        RETURNING id;
      `;
      const values = [userId, repoId, content];
      const result = await client.query(query, values); // Use the acquired client
      console.log(`Git data stored with ID: ${result.rows[0].id}`);
      return result.rows[0].id; // Often useful to return the new ID
    } catch (error) {
      console.error('Error saving Git data:', error);
      throw error;
    } finally {
      client.release(); // Release the client back to the pool
    }
  }

  // Save Wiki data
  async saveWikiData(userId, repoId, content) {
    const client = await this.pool.connect(); // Acquire a client from the pool
    try {
      const query = `
        INSERT INTO wiki_data (user_id, repo_id, content)
        VALUES ($1, $2, $3)
        RETURNING id;
      `;
      const values = [userId, repoId, content];
      const result = await client.query(query, values); // Use the acquired client
      console.log(`Wiki data stored with ID: ${result.rows[0].id}`);
      return result.rows[0].id; // Often useful to return the new ID
    } catch (error) {
      console.error('Error saving Wiki data:', error);
      throw error;
    } finally {
      client.release(); // Release the client back to the pool
    }
  }

  // Save AI-generated response
  async saveAiResponse({ userId, conversationId, repoId, prompt, response }) {
    const client = await this.pool.connect(); // Acquire a client from the pool
    try {
      const query = `
        INSERT INTO ai_responses (user_id, conversation_id, repo_id, prompt, response)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id;
      `;
      const values = [userId, conversationId, repoId, prompt, response];
      const result = await client.query(query, values); // Use the acquired client
      console.log(`AI response stored with ID: ${result.rows[0].id}`);
      return result.rows[0].id; // Often useful to return the new ID
    } catch (error) {
      console.error('Error saving AI response:', error);
      throw error;
    } finally {
      client.release(); // Release the client back to the pool
    }
  }

  // Retrieve AI responses for a conversation
  async getAiResponses(conversationId) {
    const client = await this.pool.connect(); // Acquire a client from the pool
    try {
      const query = `SELECT * FROM ai_responses WHERE conversation_id = $1 ORDER BY created_at DESC;`;
      const result = await client.query(query, [conversationId]); // Use the acquired client
      return result.rows;
    } catch (error) {
      console.error('Error retrieving AI responses:', error);
      throw error;
    } finally {
      client.release(); // Release the client back to the pool
    }
  }
}

module.exports = AIPostgresAdapter;