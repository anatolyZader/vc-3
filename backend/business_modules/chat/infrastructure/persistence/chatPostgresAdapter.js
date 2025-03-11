// chatPostgresAdapter.js
/* eslint-disable no-unused-vars */
'use strict';

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const IChatPersistPort = require('../../domain/ports/IChatPersistPort');

class ChatPostgresAdapter extends IChatPersistPort {
  constructor() {
    super();
    this.pool = new Pool({
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      host: process.env.PG_HOST,
      port: process.env.PG_PORT,
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
