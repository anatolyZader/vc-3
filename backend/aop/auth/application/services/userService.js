'use strict';

const User = require('../../domain/entities/user');

class UserService {
  constructor(authPersistAdapter, authInMemStorageAdapter) {
    this.authPersistAdapter = authPersistAdapter;
    this.authInMemStorageAdapter = authInMemStorageAdapter; 
    console.log("authPersistAdapter at userService.js: ", this.authPersistAdapter);
    console.log("authInMemStorageAdapter at userService.js: ", this.authInMemStorageAdapter);
  }

  async readUsers() {
    try {
      const users = await this.authPersistAdapter.readAllUsers();
      console.log('Users retrieved successfully:', users);
      return users;
    } catch (error) {
      console.error('Error retrieving users:', error);
      throw error;
    }
  }

  async register(username, email, password) {
    try {
      const user = new User(username, email);
      const newUser = await user.register(username, email, password, this.authPersistAdapter);
      console.log('User registered successfully:', newUser);
      return newUser;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  async readUser(email) {
    try {
      const user = new User(); 
      const userData = await user.readUser(email, this.authPersistAdapter);
      console.log('User retrieved successfully:', userData);
      return userData;
    } catch (error) {
      console.error('Error reading user:', error);
      throw error;
    }
  }

  async removeUser(email, password) {
    try {
      const user = new User(); // No need for username during removal
      await user.removeUser(email, password, this.authPersistAdapter);
      console.log('User removed successfully');
    } catch (error) {
      console.error('Error removing user:', error);
      throw error;
    }
  }

  async storeSession(sessionId, user) {
    try {
      await this.authInMemStorageAdapter.storeSession(sessionId, user);
      console.log('Session stored successfully');
    } catch (error) {
      console.error('Error storing session:', error);
      throw error;
    }
  }

  async getSession(sessionId) {
    try {
      const session = await this.authInMemStorageAdapter.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }
      console.log('Session retrieved successfully:', session);
      return session;
    } catch (error) {
      console.error('Error retrieving session:', error);
      throw error;
    }
  }

  async deleteSession(sessionId) {
    try {
      await this.authInMemStorageAdapter.deleteSession(sessionId);
      console.log('Session deleted successfully');
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }
}

module.exports = UserService;
