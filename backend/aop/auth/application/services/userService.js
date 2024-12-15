'use strict';
const user = require('../../domain/entities/user');

class UserService {
  constructor() {
    console.log('UserService instantiated!');
    this.user = user; 
  }

  async readUsers(authPersistAdapter) {
    try {
      const users = await authPersistAdapter.readAllUsers();
      console.log('Users retrieved successfully:', users);
      return users;
    } catch (error) {
      console.error('Error retrieving users:', error);
      throw error;
    }
  }

  async register(username, email, password, authPersistAdapter) {
    try {
      const newUser = await user.register(username, email, password, authPersistAdapter);
      console.log('User registered successfully:', newUser);
      return newUser;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  async readUser(email, authPersistAdapter) {
    try {
      const userData = await user.readUser(email, authPersistAdapter);
      console.log('User retrieved successfully:', userData);
      return userData;
    } catch (error) {
      console.error('Error reading user:', error);
      throw error;
    }
  }

  async removeUser(email, password, authPersistAdapter) {
    try {
      await user.removeUser(email, password, authPersistAdapter);
      console.log('User removed successfully');
    } catch (error) {
      console.error('Error removing user:', error);
      throw error;
    }
  }

  async storeSession(sessionId, userData, authInMemStorageAdapter) {
    try {
      await authInMemStorageAdapter.storeSession(sessionId, userData);
      console.log('Session stored successfully');
    } catch (error) {
      console.error('Error storing session:', error);
      throw error;
    }
  }

  async getSession(sessionId, authInMemStorageAdapter) {
    try {
      const session = await authInMemStorageAdapter.getSession(sessionId);
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

  async deleteSession(sessionId, authInMemStorageAdapter) {
    try {
      await authInMemStorageAdapter.deleteSession(sessionId);
      console.log('Session deleted successfully');
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }
}

module.exports = UserService;
