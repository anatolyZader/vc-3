'use strict';

const IAuthInMemoryPort = require('../../domain/ports/IAuthInMemStoragePort');

class AuthRedisAdapter extends IAuthInMemoryPort {
  constructor(redisClient) {
    super();
    this.redisClient = redisClient;
  }

  async storeSession(sessionId, user) {
    try {
      await this.redisClient.set(`session:${sessionId}`, JSON.stringify(user), 'EX', 3600);
    } catch (error) {
      console.error('Error storing session in Redis:', error);
      throw error;
    }
  }

  async getSession(sessionId) {
    try {
      const userData = await this.redisClient.get(`session:${sessionId}`);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error fetching session from Redis:', error);
      throw error;
    }
  }

  async deleteSession(sessionId) {
    try {
      await this.redisClient.del(`session:${sessionId}`);
    } catch (error) {
      console.error('Error deleting session in Redis:', error);
      throw error;
    }
  }
}

module.exports = AuthRedisAdapter;
