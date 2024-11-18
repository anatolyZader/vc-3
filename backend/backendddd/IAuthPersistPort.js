/* eslint-disable no-unused-vars */
'use strict';

class IAuthPersistPort {
  constructor() {
    if (new.target === IAuthPersistPort) {
      throw new Error("Cannot instantiate an abstract class.");
    }
  }

  async createUser(username, email, password) {
    throw new Error("Method 'createUser(username, email, passwordHash)' must be implemented.");
  }

  async readUser(username) {
    throw new Error("Method 'readUser(username)' must be implemented.");
  }

  async removeUser(username, passwordHash) {
    throw new Error("Method 'removeUser(username, passwordHash)' must be implemented.");
  }

  async findUserByUsername(username) {
    throw new Error("Method 'findUserByUsername(username)' must be implemented.");
  }

  async loginUser(username, passwordHash) {
    throw new Error("Method 'loginUser(username, passwordHash)' must be implemented.");
  }

  async logoutUser(sessionId) {
    throw new Error("Method 'logoutUser(sessionId)' must be implemented.");
  }

  // New Functionality

  // Store a verification code for two-stage verification
  async storeVerificationCode(email, code) {
    throw new Error("Method 'storeVerificationCode(email, code)' must be implemented.");
  }

  // Validate the provided verification code for a given email
  async verifyCode(email, code) {
    throw new Error("Method 'verifyCode(email, code)' must be implemented.");
  }

  // Find or create a user based on Google OAuth2 token information
  async findOrCreateUser(googleUser) {
    throw new Error("Method 'findOrCreateUser(googleUser)' must be implemented.");
  }
}

module.exports = IAuthPersistPort;
