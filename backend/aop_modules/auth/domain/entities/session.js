'use strict';

const { v4: uuidv4 } = require('uuid');

class Session {
  constructor(userId, IAuthInMemStoragePort) {
    this.sessionId = uuidv4();
    this.userId = userId;
    this.createdAt = new Date();
    this.IAuthInMemStoragePort = IAuthInMemStoragePort;
  }

  async setSessionInMem() {
    try {
      await this.IAuthInMemStoragePort.setSessionInMem(this.sessionId, this);
      console.log('Session set successfully in-memory!');
    } catch (error) {
      console.error('Error setting session in-memory:', error);
      throw error;
    }
  }

  async validateSession() {
    const sessionData = await this.IAuthInMemStoragePort.getSession(this.sessionId);
    const oneHour = 3600000;
    return sessionData && (new Date() - new Date(sessionData.createdAt) < oneHour);
  }

  async logout() {
    try {
      await this.IAuthInMemStoragePort.deleteSession(this.sessionId);
      console.log('Session successfully terminated.');
    } catch (error) {
      console.error('Error logging out session:', error);
      throw error;
    }
  }
}

module.exports = Session;
