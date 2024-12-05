/* eslint-disable no-unused-vars */
'strict';
// session.js

const { v4: uuidv4 } = require('uuid');

class Session {
  constructor(userId, IAuthPersistencePort) {
    this.sessionId = uuidv4();
    this.userId = userId;
    this.createdAt = new Date();
    this.IAuthPersistencePort = IAuthPersistencePort;
    this.createSession(); // Automatically create session when Session object is instantiated
  }

  async login (username, password, IAuthPersistencePort) {
      try {
        console.log('Logging in user...'); 
  } catch (error) {    
      console.error('Error logging in user:', error);
      throw error;
  }};

  async logout () {
      try {
          console.log('Logging out user...'); 
  } catch (error) {    
      console.error('Error logging out user:', error);
      throw error;
  }};


  async createSession() {
    try {
      await this.IAuthPersistencePort.saveSession(this);
      console.log('Session created successfully!');
    } catch (error) {
      console.error("Error creating session:", error);
      throw error;
    }
  }

  async validateSession() {
    try {
      const sessionData = await this.IAuthPersistencePort.fetchSession(this.sessionId);
      if (sessionData && new Date() - new Date(sessionData.createdAt) < 3600000) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error validating session:', error);
      throw error;
    }
  }
}



module.exports = Session;
