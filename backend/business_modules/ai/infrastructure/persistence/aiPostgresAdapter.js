// infrastructure/persistence/aissistPostgresAdapter.js
'use strict';

const { Pool } = require('pg');
const IAIPersistPort = require('../../domain/ports/IAIPersistPort');

class aiPostgresAdapter extends IAIPersistPort {
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

  async startConversation(userId, conversation) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO ai_conversations (id, user_id, start_date) VALUES ($1, $2, $3)`,
        [conversation.conversationId, userId, new Date()]
      );
      console.log(`Started AI conversation ${conversation.conversationId} for user ${userId}`);
    } catch (error) {
      console.error('Error starting AI conversation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

}

module.exports = aiPostgresAdapter;