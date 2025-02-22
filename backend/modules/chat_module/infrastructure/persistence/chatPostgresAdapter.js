// chatPostgresAdapter.js
/* eslint-disable no-unused-vars */
'use strict';

const { Pool } = require('pg');
const IChatPersistPort = require('../../domain/ports/IChatPersistPort');
const Conversation = require('../../domain/aggregates/conversation');
const ConversationTitle = require('../../domain/value_objects/conversationTitle');
const PromptContent = require('../../domain/value_objects/promptContent');
const Question = require('../../domain/entities/question');

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

  /**
   * Persist a newly started conversation.
   * Domain layer now provides conversationId and a Value Object for the title.
   */
  async startConversation(userId, conversation) {
    const client = await this.pool.connect();
    try {
      const conversationId = conversation.conversationId;      
      const conversationTitle = conversation.title.toString(); // Value Object -> string
      const startDate = new Date();

      await client.query(
        `INSERT INTO conversations (id, user_id, title, start_date)
         VALUES ($1, $2, $3, $4)`,
        [conversationId, userId, conversationTitle, startDate]
      );

      console.log(`Started conversation ${conversationId} for user ${userId}`);
      return { conversationId };
    } catch (error) {
      console.error('Error starting conversation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * OPTIONAL: Save conversation using a simplified method.
   * Used by ChatService to ensure conversation is persisted.
   */
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

  /**
   * Fetch all conversations for a user.
   * Returns reconstructed domain objects (optional).
   */
  async fetchConversationHistory(userId) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT * FROM conversations
         WHERE user_id = $1
         ORDER BY start_date DESC`,
        [userId]
      );

      console.log('Conversation history retrieved successfully for user:', userId);

      const conversations = rows.map((row) => {
        const conv = new Conversation(row.user_id, row.title);
        conv.conversationId = row.id;
        conv.startDate = row.start_date;
        return conv;
      });

      return conversations;
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Fetch a single conversation by ID.
   * Returns a domain object or null if not found.
   */
  async fetchConversation(userId, conversationId) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT * FROM conversations
         WHERE user_id = $1 AND id = $2`,
        [userId, conversationId]
      );

      if (rows.length === 0) {
        console.log(`No conversation found with ID: ${conversationId} for user ${userId}`);
        return null;
      }

      const row = rows[0];
      const conversation = new Conversation(row.user_id, row.title);
      conversation.conversationId = row.id;
      conversation.startDate = row.start_date;

      console.log(`Fetched conversation with ID: ${conversationId} for user ${userId}`);
      return conversation;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Rename a conversation using a Value Object for the title.
   */
  async renameConversation(userId, conversationId, newTitleVO) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE conversations
         SET title = $1
         WHERE user_id = $2 AND id = $3`,
        [newTitleVO.toString(), userId, conversationId]
      );
      console.log(`Renamed conversation ${conversationId} to ${newTitleVO.toString()} for user ${userId}`);
    } catch (error) {
      console.error('Error renaming conversation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a conversation from the DB.
   */
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

  /**
   * Persist a new question in the DB.
   * The Question domain object has a Value Object for its content.
   */
  async sendQuestion(userId, conversationId, question) {
    const client = await this.pool.connect();
    try {
      const questionId = question.questionId; // Domain question entity already has an ID
      const questionContent = question.content.toString(); // Value Object -> string

      await client.query(
        `INSERT INTO questions (id, user_id, conversation_id, prompt)
         VALUES ($1, $2, $3, $4)`,
        [questionId, userId, conversationId, questionContent]
      );
      console.log(`Question sent with ID: ${questionId} for conversation ${conversationId}`);
      return { questionId };
    } catch (error) {
      console.error('Error sending question:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * [CHAT.JSX INTEGRATION] Edit a question's content.
   */
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

  /**
   * [CHAT.JSX INTEGRATION] Search for conversations by title.
   */
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

  /**
   * [CHAT.JSX INTEGRATION] Persist an answer for a conversation.
   */
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

  /**
   * [CHAT.JSX INTEGRATION] Mark a conversation as shared.
   * Assumes a "shared" boolean column exists.
   */
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
