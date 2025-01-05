'use strict';
// userService.js

const User = require('../../domain/entities/user');

class UserService {
  constructor() {
    this.User = User; 
  }

  async readAllUsers(authPersistAdapter) {
    try {
      const users = await authPersistAdapter.readAllUsers();
      console.log('Users retrieved successfully:', users);
      return users;
    } catch (error) {
      console.error('Error retrieving users:', error);
      throw error;
    }
  }

  async registerUser(username, email, password, authPersistAdapter) {
    try {
      const userInstance = new this.User();
      const newUser = await userInstance.registerUser(username, email, password, authPersistAdapter);
      console.log('User registered successfully:', newUser);
      return newUser;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  async removeUser(email, authPersistAdapter) {
    try {
      const userInstance = new this.User();
      console.log('userInstance instantiated at userService removeUser method: ', userInstance);
      await userInstance.removeUser(email, authPersistAdapter);
      console.log('User removed successfully');
    } catch (error) {
      console.error('Error removing user:', error);
      throw error;
    }
  }

  async getUserInfo(email, authPersistAdapter) {
    try {
      const userInstance = new this.User();
      const userData = await userInstance.getUserInfo(email, authPersistAdapter);
      console.log('User retrieved successfully:', userData);
      return userData;
    } catch (error) {
      console.error('Error reading user:', error);
      throw error;
    }
  }
}

module.exports = UserService;
