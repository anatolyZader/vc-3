/* eslint-disable no-unused-vars */

/**
 * IUserService - ABSTRACT INTERFACE (NOT IMPLEMENTED)
 * 
 * This is an abstract base class that defines the contract for user services.
 * DO NOT USE THIS FILE TO CHECK FOR IMPLEMENTATIONS.
 * 
 * For actual implementations, see:
 * - UserService class in: backend/aop_modules/auth/application/services/userService.js
 * 
 * All methods below throw errors and are NOT implemented here.
 */
class IUserService {
  constructor() {
    if (new.target === IUserService) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async readAllUsers() {
    throw new Error('Method not implemented.');
  }

  async getUserInfo() {
    throw new Error('Method not implemented.');
  }

  async register(username, email, password) {
    throw new Error('Method not implemented.');
  }

  async removeUser(email) {
    throw new Error('Method not implemented.');
  }
}

module.exports = IUserService;
