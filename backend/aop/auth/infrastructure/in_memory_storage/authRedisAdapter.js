'use strict';

const IAuthInMemoryPort = require('../../domain/ports/IAuthInMemStoragePort');
const redisClient = require('../../../../redisClient');

class AuthRedisAdapter extends IAuthInMemoryPort {

  async storeSession(sessionId, user) {
    try {
      await redisClient.set(`session:${sessionId}`, JSON.stringify(user), 'EX', 3600);
    } catch (error) {
      console.error('Error storing session in Redis:', error);
      throw error;
    }
  }

  async getSession(sessionId) {
    try {
      const userData = await redisClient.get(`session:${sessionId}`);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error fetching session from Redis:', error);
      throw error;
    }
  }

  async deleteSession(sessionId) {
    try {
      await redisClient.del(`session:${sessionId}`);
    } catch (error) {
      console.error('Error deleting session in Redis:', error);
      throw error;
    }
  }
}

module.exports = AuthRedisAdapter;
