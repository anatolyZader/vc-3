// chatPostgresAdapter.js
/* eslint-disable no-unused-vars */
'use strict';

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const IChatPersistPort = require('../../domain/ports/IChatPersistPort');

class ChatPostgresAdapter extends IChatPersistPort {
  constructor({ cloudSqlConnector }) {
    super();
    this.connector = cloudSqlConnector;
    const instanceConnectionName = process.env.CLOUD_SQL_CONNECTION_NAME;
    if (!instanceConnectionName) {
      console.error('❌ CLOUD_SQL_CONNECTION_NAME environment variable is not set. Cannot connect to Cloud SQL.');
      // In a production app, you might want to throw an error or handle this more gracefully.
      // For now, we'll proceed with a fallback, but it's important for Cloud Run.
    }

    const poolConfig = {
      user:     process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      host: `localhost`, // Connector creates a local proxy, so connect to localhost
      port: 5432, // Connector typically proxies to default PostgreSQL port
     
    };
    console.info('[DB] pgConfig chosen:', poolConfig);   
      this.pool = new Pool({
      user: poolConfig.user,
      password: poolConfig.password,
      database: poolConfig.database,
      ssl: false, // Cloud SQL Connector handles encryption, so no SSL needed for pg client
      connectionString: undefined, // Always undefined, as we always use the custom client factory

      Client: class CloudSQLClient extends Pool.Client { // Always use the custom client
            constructor(config) {
              super(config);
              this.config = config; // Store config for potential reuse

              // Override the connect method to use the connector's socket
              const originalConnect = this.connect.bind(this);
              this.connect = async (callback) => {
                try {
                  // Use the injected connector from the config
                  const socketPath = await this.config.cloudSqlConnector.getSocket(this.config.instanceConnectionName);
                  // Modify the config to use the socketPath
                  this.connectionParameters.host = socketPath;
                  this.connectionParameters.port = undefined; // No port when using socketPath
                  this.connectionParameters.ssl = false; // Connector handles SSL
                  // Setting connectionString: undefined and ssl: false when using the CloudSQLClient is generally correct as the connector handles the actual connection. 

                  return originalConnect(callback);
                } catch (err) {
                  console.error('Error getting Cloud SQL socket:', err);
                  if (callback) callback(err);
                  throw err;
                }
              };
            }
          }, 

      cloudSqlConnector: this.connector, 
      instanceConnectionName: instanceConnectionName,
    });

    console.info('[DB] pgConfig chosen (after connector setup):', {
      user: poolConfig.user,
      database: poolConfig.database,
      host: instanceConnectionName ? `Cloud SQL Connector via ${instanceConnectionName}` : poolConfig.host,
      port: poolConfig.port,
    });
 }

  // ✅ Start a new conversation
  async startConversation(userId) {
    const client = await this.pool.connect();
    try {
      const conversationId = uuidv4();
      await client.query(
        `INSERT INTO conversations (id, user_id) VALUES ($1, $2)`,
        [conversationId, userId]
      );
      console.log(`Started new conversation ${conversationId} for user ${userId}`);
      return conversationId;
    } catch (error) {
      console.error('Error starting conversation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ✅ Fetch all conversations for a user
  async fetchConversationsHistory(userId) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT id, title, created_at FROM conversations WHERE user_id = $1 ORDER BY created_at DESC`,
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
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT * FROM chat_messages WHERE user_id = $1 AND conversation_id = $2 ORDER BY created_at ASC`,
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
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE conversations SET title = $1 WHERE user_id = $2 AND id = $3`,
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
    const client = await this.pool.connect();
    try {
      await client.query(
        `DELETE FROM conversations WHERE user_id = $1 AND id = $2`,
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
    const client = await this.pool.connect();
    try {
      const messageId = uuidv4();
      await client.query(
        `INSERT INTO chat_messages (id, conversation_id, user_id, role, content) VALUES ($1, $2, $3, 'user', $4)`,
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
    const client = await this.pool.connect();
    try {
      const messageId = uuidv4();
      await client.query(
        `INSERT INTO chat_messages (id, conversation_id, user_id, role, content) VALUES ($1, $2, $3, 'ai', $4)`,
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
