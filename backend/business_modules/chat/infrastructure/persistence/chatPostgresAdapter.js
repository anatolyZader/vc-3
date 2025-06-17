// chatPostgresAdapter.js
/* eslint-disable no-unused-vars */
'use strict';

const { Pool } = require('pg'); // Only Pool is needed now
const { v4: uuidv4 } = require('uuid');
const IChatPersistPort = require('../../domain/ports/IChatPersistPort');

// Determine if running locally or in production based on NODE_ENV
const isLocal = process.env.NODE_ENV !== 'production';

class ChatPostgresAdapter extends IChatPersistPort {
  constructor({ cloudSqlConnector }) {
    super();
    this.connector = cloudSqlConnector;
    this.pool = null; // Will be set asynchronously later

    // Initialize poolPromise in the constructor, similar to AuthPostgresAdapter
    this.poolPromise = isLocal
      ? this.createLocalPool()
      : this.createCloudSqlPool(cloudSqlConnector);
  }

  /**
   * Asynchronously retrieves the PostgreSQL connection pool.
   * Ensures the pool is initialized only once.
   * @returns {Promise<Pool>} The pg.Pool instance.
   */
  async getPool() {
    if (!this.pool) {
      this.pool = await this.poolPromise;
    }
    return this.pool;
  }

  /**
   * Creates and returns a PostgreSQL Pool for local development.
   * @returns {Promise<Pool>} A promise that resolves with the local Pool instance.
   */
  createLocalPool() {
    const config = {
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      host: 'localhost',
      port: 5432,
    };
    console.info('[DB] Using local Postgres config (Chat):', config);
    // Return a resolved promise with the new Pool instance
    return Promise.resolve(new Pool(config));
  }

  /**
   * Creates and returns a PostgreSQL Pool configured for Google Cloud SQL.
   * Uses the cloudSqlConnector to get the necessary connection options.
   * @param {object} connector The Cloud SQL Connector instance.
   * @returns {Promise<Pool>} A promise that resolves with the Cloud SQL Pool instance.
   */
  async createCloudSqlPool(connector) {
    const instanceConnectionName = process.env.CLOUD_SQL_CONNECTION_NAME;
    if (!instanceConnectionName) {
      // Throwing an error here is better than proceeding with a misconfigured DB.
      throw new Error('❌ CLOUD_SQL_CONNECTION_NAME environment variable is not set. Cannot connect to Cloud SQL.');
    }

    // Use the connector to get the low-level connection options for the pg client
    const clientOpts = await connector.getOptions({
      instanceConnectionName,
      // You might need to specify ipType and authType based on your Cloud SQL Connector setup
      // For Cloud Run/Cloud Functions, 'PUBLIC' IP might be needed if not using VPC-SC.
      // 'PRIVATE' is generally preferred if your compute can access private IPs.
      // 'ADC' is good for production environments using Application Default Credentials.
      ipType: 'PRIVATE', // Or 'PUBLIC' depending on your setup
      authType: 'ADC',   // Or 'IAM' if you're using IAM authentication for database users
    });

    const config = {
      ...clientOpts, // Spread the options provided by the connector
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      // No need for 'host', 'port', 'ssl', or 'connectionString' explicitly here,
      // as they are provided by `clientOpts` from the connector.
    };

    console.info('[DB] Using Cloud SQL config (Chat) for:', instanceConnectionName);
    return new Pool(config); // Create a standard pg.Pool
  }

  // ✅ Start a new conversation
  async startConversation(userId, title = 'New Chat', conversationId = null) {
    const pool = await this.getPool(); // Get the initialized pool
    const client = await pool.connect();
    try {
      // Use provided conversationId or generate one
      const finalConversationId = conversationId || uuidv4();
      await client.query(
        `INSERT INTO chat.conversations (id, user_id, title) VALUES ($1, $2, $3)`,
        [finalConversationId, userId, title]
      );
      console.log(`Started new conversation ${finalConversationId} for user ${userId}`);
      return finalConversationId;
    } catch (error) {
      console.error('Error starting conversation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ✅ Fetch all conversations for a user
  async fetchConversationsHistory(userId) {
    const pool = await this.getPool(); // Get the initialized pool
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT id, title, created_at FROM chat.conversations WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      );
      return rows;
    } catch (error) {
      console.error('Error retrieving conversations history:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ✅ Fetch a full conversation (messages)
  async fetchConversation(userId, conversationId) {
    const pool = await this.getPool(); // Get the initialized pool
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT * FROM chat.messages WHERE user_id = $1 AND conversation_id = $2 ORDER BY created_at ASC`,
        [userId, conversationId]
      );
      return rows;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ✅ Rename a conversation
  async renameConversation(userId, conversationId, newTitle) {
    const pool = await this.getPool(); // Get the initialized pool
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE chat.conversations SET title = $1 WHERE user_id = $2 AND id = $3`,
        [newTitle, userId, conversationId]
      );
      console.log(`Renamed conversation ${conversationId} to ${newTitle}`);
    } catch (error) {
      console.error('Error renaming conversation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ✅ Delete a conversation
  async deleteConversation(userId, conversationId) {
    const pool = await this.getPool(); // Get the initialized pool
    const client = await pool.connect();
    try {
      await client.query(
        `DELETE FROM chat.conversations WHERE user_id = $1 AND id = $2`,
        [userId, conversationId]
      );
      console.log(`Deleted conversation ${conversationId} for user ${userId}`);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ✅ Add a user question to the conversation
  async addQuestion(userId, conversationId, prompt) {
    const pool = await this.getPool(); // Get the initialized pool
    const client = await pool.connect();
    try {
      const messageId = uuidv4();
      await client.query(
        `INSERT INTO chat.messages (id, conversation_id, user_id, role, content) VALUES ($1, $2, $3, 'user', $4)`,
        [messageId, conversationId, userId, prompt]
      );
      console.log(`Stored user question with ID ${messageId}`);
      return messageId;
    } catch (error) {
      console.error('Error storing question:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ✅ Add an AI response to the conversation
  async addAnswer(userId, conversationId, answer) {
    const pool = await this.getPool(); // Get the initialized pool
    const client = await pool.connect();
    try {
      const messageId = uuidv4();
      await client.query(
        `INSERT INTO chat.messages (id, conversation_id, user_id, role, content) VALUES ($1, $2, $3, 'ai', $4)`,
        [messageId, conversationId, userId, answer]
      );
      console.log(`Stored AI response with ID ${messageId}`);
      return messageId;
    } catch (error) {
      console.error('Error storing AI response:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = ChatPostgresAdapter;