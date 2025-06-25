// chatPostgresAdapter.js
/* eslint-disable no-unused-vars */
'use strict';

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const IChatPersistPort = require('../../domain/ports/IChatPersistPort');

const isLocal = process.env.NODE_ENV !== 'staging';

class ChatPostgresAdapter extends IChatPersistPort {
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
        console.info('[DB] Using local Postgres config (Chat):', config);
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

        console.info('[DB] Using Cloud SQL config (Chat) for:', instanceConnectionName);
        return new Pool(config);
    }

    async startConversation(userId, title = 'New Chat', conversationId = null) {
        const pool = await this.getPool();
        const client = await pool.connect();
        try {
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

    async fetchConversationsHistory(userId) {
        const pool = await this.getPool();
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

    // ✅ FIX: Removed user_id from WHERE clause and explicitly selected columns
    async fetchConversation(userId, conversationId) { // userId is passed but not used in the query for messages table
        const pool = await this.getPool();
        const client = await pool.connect();
        try {
            const { rows } = await client.query(
                `SELECT
                    id,
                    conversation_id,
                    sender_type,     -- ✅ Use sender_type
                    content,
                    created_at,
                    message_order    -- ✅ Include message_order
                FROM chat.messages
                WHERE conversation_id = $1
                ORDER BY message_order ASC`, // ✅ Order by message_order
                [conversationId] // Only conversationId is needed for this query
            );
            return rows;
        } catch (error) {
            console.error('Error fetching conversation:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async renameConversation(userId, conversationId, newTitle) {
        const pool = await this.getPool();
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

    async deleteConversation(userId, conversationId) {
        const pool = await this.getPool();
        const client = await pool.connect();
        try {
            // It's good practice to delete messages first due to foreign key constraints,
            // or ensure CASCADE DELETE is set up on your conversation_id foreign key.
            await client.query(`DELETE FROM chat.messages WHERE conversation_id = $1`, [conversationId]);
            await client.query(`DELETE FROM chat.conversations WHERE user_id = $1 AND id = $2`, [userId, conversationId]);
            console.log(`Deleted conversation ${conversationId} for user ${userId}`);
        } catch (error) {
            console.error('Error deleting conversation:', error);
            throw error;
        } finally {
            client.release();
        }
    }

 
  /**
   * Persist a user’s question into chat.messages
   */
  /** Persist a user’s question */
  async addQuestion(userId, conversationId, prompt) {
    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      const messageId = uuidv4();

      // Get next message_order
      const { rows } = await client.query(
        `SELECT MAX(message_order) AS max_order
           FROM chat.messages
          WHERE conversation_id = $1`,
        [conversationId]
      );
      const nextOrder = (rows[0].max_order || 0) + 1;

      // Insert into the exact columns, using 'user' for sender_type
      await client.query(
        `INSERT INTO chat.messages
           (id,
            conversation_id,
            sender_type,
            content,
            message_order)
         VALUES
           ($1, $2, 'user', $3, $4)`,
        [messageId, conversationId, prompt, nextOrder]
      );

      console.log(`Stored user question with ID ${messageId}`);
      return messageId;
    } catch (err) {
      console.error('Error storing question:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  /** Persist an AI’s answer */
  async addAnswer(userId, conversationId, answer) {
    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      const messageId = uuidv4();

      // Get next message_order
      const { rows } = await client.query(
        `SELECT MAX(message_order) AS max_order
           FROM chat.messages
          WHERE conversation_id = $1`,
        [conversationId]
      );
      const nextOrder = (rows[0].max_order || 0) + 1;

      // Insert into the exact columns, using 'assistant' for sender_type
      await client.query(
        `INSERT INTO chat.messages
           (id,
            conversation_id,
            sender_type,
            content,
            message_order)
         VALUES
           ($1, $2, 'assistant', $3, $4)`,
        [messageId, conversationId, answer, nextOrder]
      );

      console.log(`Stored AI response with ID ${messageId}`);
      return messageId;
    } catch (err) {
      console.error('Error storing AI response:', err);
      throw err;
    } finally {
      client.release();
    }
  }

}

module.exports = ChatPostgresAdapter;