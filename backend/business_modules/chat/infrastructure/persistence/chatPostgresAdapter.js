// chatPostgresAdapter.js
/* eslint-disable no-unused-vars */
'use strict';

const { Pool } = require('pg');
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

  async startConversation(userId, title) {
    const client = await this.pool.connect();
 
      console.log(`Starting conversation`);
    }

  async saveConversation(conversationId, userId, title) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO conversations (id, user_id, title, start_date)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [conversationId, userId, title]
      );
      console.log(`Saved conversation ${conversationId} for user ${userId}`);
    } catch (error) {
      console.error('Error saving conversation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async fetchConversationsHistory(userId) {
    const client = await this.pool.connect();

      console.log('Conversations history retrieved successfully for user:', userId);

  }

  async fetchConversation(userId, conversationId) {
    const client = await this.pool.connect();


      console.log(`Fetched conversation with ID: ${conversationId} for user ${userId}`);

  }

  async renameConversation(userId, conversationId, newTitle) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE conversations
         SET title = $1
         WHERE user_id = $2 AND id = $3`,
        [newTitle.toString(), userId, conversationId]
      );
      console.log(`Renamed conversation ${conversationId} to ${newTitle.toString()} for user ${userId}`);
    } catch (error) {
      console.error('Error renaming conversation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteConversation(userId, conversationId) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `DELETE FROM conversations
         WHERE user_id = $1 AND id = $2`,
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

  async sendQuestion(userId, conversationId, prompt) {
    const client = await this.pool.connect();
    console.log(`Sending question`);
  }

  async editQuestion(questionId, newContent) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE questions
         SET prompt = $1, timestamp = NOW()
         WHERE id = $2`,
        [newContent.toString(), questionId]
      );
      console.log(`Edited question ${questionId} with new content: ${newContent.toString()}`);
    } catch (error) {
      console.error('Error editing question:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async searchInConversations(userId, query) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT * FROM conversations
         WHERE user_id = $1 AND title ILIKE $2
         ORDER BY start_date DESC`,
        [userId, `%${query}%`]
      );
      console.log(`Found ${rows.length} conversations for user ${userId} matching query "${query}"`);
      return rows;
    } catch (error) {
      console.error('Error searching conversations:', error);
      throw error;
    } finally {
      client.release();
    }
  }


  async sendAnswer(userId, conversationId, answer) {
    const client = await this.pool.connect();
    try {
      const answerId = answer.answerId; // Domain answer entity already has an ID
      const answerContent = answer.content.toString(); // Value Object -> string
      const timestamp = answer.timestamp || new Date();

      await client.query(
        `INSERT INTO answers (id, user_id, conversation_id, content, timestamp)
         VALUES ($1, $2, $3, $4, $5)`,
        [answerId, userId, conversationId, answerContent, timestamp]
      );
      console.log(`Answer sent with ID: ${answerId} for conversation ${conversationId}`);
      return { answerId };
    } catch (error) {
      console.error('Error sending answer:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async shareConversation(conversationId) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE conversations
         SET shared = TRUE
         WHERE id = $1`,
        [conversationId]
      );
      console.log(`Marked conversation ${conversationId} as shared.`);
    } catch (error) {
      console.error('Error sharing conversation:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = ChatPostgresAdapter;
