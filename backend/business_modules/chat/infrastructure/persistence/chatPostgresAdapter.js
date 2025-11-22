// chatPostgresAdapter.js
/* eslint-disable no-unused-vars */
'use strict';

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const IChatPersistPort = require('../../domain/ports/IChatPersistPort');
const { getDbConfig, getEnvironmentInfo, setLegacyEnvVars } = require('../../../../config/dbConfig');

const envInfo = getEnvironmentInfo();

class ChatPostgresAdapter extends IChatPersistPort {
    constructor({ cloudSqlConnector }) {
        super();
        this.connector = cloudSqlConnector;
        this.pool = null;
        // Initialize environment-specific database configuration
        this.initPromise = setLegacyEnvVars().then(() => {
            this.poolPromise = envInfo.isLocal
                ? this.createLocalPool()
                : this.createCloudSqlPool(cloudSqlConnector);
        });
    }

    async getPool() {
        if (!this.pool) {
            await this.initPromise; // Wait for environment initialization
            this.pool = await this.poolPromise;
        }
        return this.pool;
    }

    async createLocalPool() {
        const dbConfig = await getDbConfig();
        const config = {
            user: process.env.PG_USER,
            password: process.env.PG_PASSWORD,
            database: process.env.PG_DATABASE,
            host: dbConfig.host,
            port: dbConfig.port,
            ssl: dbConfig.ssl,
            max: dbConfig.maxConnections,
        };
        
        return Promise.resolve(new Pool(config));
    }

    async createCloudSqlPool(connector) {
        // Skip Cloud SQL connection in test environment
        if (process.env.NODE_ENV === 'test') {
            console.warn('⚠️ Skipping Cloud SQL connection in test environment');
            return this.createLocalPool();
        }
        
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
                `SELECT 
                    id as "conversationId", 
                    title, 
                    created_at as "createdAt",
                    created_at as "updatedAt"
                FROM chat.conversations 
                WHERE user_id = $1 
                ORDER BY created_at DESC`,
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

    // ✅ FIX: Return complete conversation object with metadata and messages
    async fetchConversation(userId, conversationId) {
        const pool = await this.getPool();
        const client = await pool.connect();
        try {
            // First, get the conversation metadata
            const conversationQuery = await client.query(
                `SELECT id, title, created_at, updated_at 
                 FROM chat.conversations 
                 WHERE id = $1 AND user_id = $2`,
                [conversationId, userId]
            );

            if (conversationQuery.rows.length === 0) {
                throw new Error(`Conversation ${conversationId} not found for user ${userId}`);
            }

            const conversation = conversationQuery.rows[0];

            // Then, get the messages
      const messagesQuery = await client.query(
        `SELECT
          id,
          conversation_id,
          CASE 
            WHEN sender_type = 'user' THEN 'user'
            WHEN sender_type IN ('assistant','ai') THEN 'ai' -- normalize both legacy 'assistant' & any 'ai'
            ELSE sender_type
          END as role,
          CASE 
            WHEN content::text LIKE '{%}' THEN 
              COALESCE((content::json->>'content'), content::text)
            ELSE content::text
          END as text,
          created_at as timestamp,
          message_order
        FROM chat.messages
        WHERE conversation_id = $1
        ORDER BY message_order ASC`,
        [conversationId]
      );

            // Return the complete conversation object in the format expected by the router
      const normalizedMessages = messagesQuery.rows.map(m => ({
        role: m.role === 'assistant' ? 'ai' : m.role, // safety: should already be 'ai' or 'user'
        text: m.text || '',
        timestamp: (m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp)
      }));

      return {
        conversationId: conversation.id,
        title: conversation.title,
        messages: normalizedMessages,
        createdAt: conversation.created_at instanceof Date ? conversation.created_at.toISOString() : conversation.created_at,
        updatedAt: conversation.updated_at instanceof Date ? conversation.updated_at.toISOString() : conversation.updated_at
      };
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

  /** Persist an AI's answer */
  async addAnswer(userId, conversationId, answer) {
    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      const messageId = uuidv4();

      // Validate inputs
      if (!conversationId) {
        throw new Error('Missing conversationId for addAnswer');
      }
      
      if (!answer) {
        console.warn('Empty answer received, storing placeholder text');
        answer = 'No response generated.';
      }
      
      // Log detailed debug information
      console.log(`Adding answer to database for conversation ${conversationId}:`, {
        messageId,
        answerLength: answer.length,
        userId,
        firstChars: answer.substring(0, 30)
      });

      // Check if conversation exists
      const checkResult = await client.query(
        'SELECT id FROM chat.conversations WHERE id = $1',
        [conversationId]
      );
      
      if (checkResult.rows.length === 0) {
        console.warn(`Creating missing conversation ${conversationId} for user ${userId}`);
        // Create the conversation if it doesn't exist to prevent foreign key errors
        await client.query(
          'INSERT INTO chat.conversations (id, user_id, title, created_at) VALUES ($1, $2, $3, NOW())',
          [conversationId, userId, 'Recovered Conversation']
        );
      }

      // Get next message_order with fallback to 1 if query fails
      let nextOrder = 1;
      try {
        const { rows } = await client.query(
          `SELECT MAX(message_order) AS max_order
             FROM chat.messages
            WHERE conversation_id = $1`,
          [conversationId]
        );
        nextOrder = (rows[0].max_order || 0) + 1;
      } catch (orderError) {
        console.error('Error getting message order, using default:', orderError);
      }

      // Insert message with retry logic
      try {
  // Insert using canonical DB value 'assistant' (DB likely constrained to 'user' | 'assistant')
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
      } catch (insertError) {
        console.error('First insert attempt failed:', insertError);
        
        // Try with a shorter message if the first attempt failed
        if (answer.length > 5000) {
          console.warn('Answer might be too long, truncating to 5000 chars');
          await client.query(
            `INSERT INTO chat.messages
               (id,
                conversation_id,
                sender_type,
                content,
                message_order)
             VALUES
               ($1, $2, 'ai', $3, $4)`,
            [messageId, conversationId, answer.substring(0, 5000) + '... (truncated)', nextOrder]
          );
        } else {
          throw insertError; // Re-throw if it wasn't a length issue
        }
      }

      console.log(`AI response stored with ID: ${messageId}`);
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