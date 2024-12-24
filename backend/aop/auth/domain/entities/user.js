'use strict';

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

class User {
  constructor() {
    this.userId = uuidv4();
    this.roles = []; 
    this.accounts = [];
  }

  async register(username, email, password, IAuthPersistencePort) {
    try {
      const newUserDTO = await IAuthPersistencePort.createUser(username, email, password);
      console.log(`New user registered successfully: ${newUserDTO}`);
      return newUserDTO;
    } catch (error) {
      console.error('Error registering new user:', error);
      throw error;
    }
  }

  async readUser(email, IAuthPersistencePort) {
    try {
      const userDTO = await IAuthPersistencePort.readUser(email);
      console.log('User read successfully:', userDTO);
      return userDTO;
    } catch (error) {
      console.error('Error reading user:', error);
      throw error;
    }
  }

  async removeUser(email, password, IAuthPersistencePort) {
    try {
      await IAuthPersistencePort.removeUser(email, password);
      console.log('User removed successfully');
    } catch (error) {
      console.error('Error removing user:', error);
      throw error;
    }
  }

  addRole(role) {
    if (!this.roles.includes(role)) {
      this.roles.push(role);
      console.log(`Role ${role} added successfully.`);
    }
  }

  removeRole(role) {
    this.roles = this.roles.filter(r => r !== role);
    console.log(`Role ${role} removed successfully.`);
  }
}

module.exports = User;
