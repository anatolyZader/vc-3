/* eslint-disable no-unused-vars */
'strict'
// IAuthDatabasePort.js
class IAuthDatabasePort {
    constructor() {
      if (new.target === IAuthDatabasePort) {
        throw new Error("Cannot instantiate an abstract class.");
      }
    }
  
    async createUser(username, email, password) {
      throw new Error("Method 'createUser(username, email, passwordHash)' must be implemented.");
    }
  
    async readUser(username) {
      throw new Error("Method 'readUser(userId)' must be implemented.");
      
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
  }
  
  module.exports = IAuthDatabasePort;
  