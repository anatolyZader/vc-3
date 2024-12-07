'use strict';

const { v4: uuidv4 } = require('uuid');

class Session {
  constructor(userId, IAuthInMemStoragePort) {
    this.sessionId = uuidv4();
    this.userId = userId;
    this.createdAt = new Date();
    this.IAuthInMemStoragePort = IAuthInMemStoragePort;
  }

  async createSession() {
    try {
      await this.IAuthInMemStoragePort.storeSession(this.sessionId, this);
      console.log('Session created successfully!');
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  async validateSession() {
    try {
      const sessionData = await this.IAuthInMemStoragePort.getSession(this.sessionId);
      const isValid = sessionData && new Date() - new Date(sessionData.createdAt) < 3600000;
      return isValid;
    } catch (error) {
      console.error('Error validating session:', error);
      throw error;
    }
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
