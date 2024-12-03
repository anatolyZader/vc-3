// IUserService.js
/* eslint-disable no-unused-vars */

class IUserService {
    constructor() {
      if (new.target === IUserService) {
        throw new Error("Cannot instantiate an abstract class.");
      }
    }
  
    async readUsers(authPostgresAdapter) {
      throw new Error('Method not implemented.');
    }
  
    async register(username, email, password, authPostgresAdapter) {
      throw new Error('Method not implemented.');
    }
  
    async readUser(username, authPostgresAdapter) {
      throw new Error('Method not implemented.');
    }
  
    async removeUser(username, password, authPostgresAdapter) {
      throw new Error('Method not implemented.');
    }
  
    async logout(username, password, authPostgresAdapter) {
      throw new Error('Method not implemented.');
    }
  }
  
  module.exports = IUserService;