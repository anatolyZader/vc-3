/* eslint-disable no-unused-vars */
'strict'
// user.js
const { v4: uuidv4 } = require('uuid');
const IAuthDatabasePort = require('../ports/IAuthDatabasePort')
class User {
  constructor(username, email, IAuthDatabasePort) {
    this.userId = uuidv4();
    this.username = username;
    this.email = email;
    this.passwordHash = '';
    this.IAuthDatabasePort = IAuthDatabasePort;
    this.accounts = []
    }

    async readUser(userId, IAuthDatabasePort) {
        try {
            const userDTO = await IAuthDatabasePort.readUser(userId);
            console.log('User read successfully:', userDTO);
            return userDTO;
        } catch (error) {
            console.error('Error reading user:', error);
            throw error;
        }
    }

    async register(username, email, password, IAuthDatabasePort) {
        try {
            // const newUserDTO = await IAuthDatabasePort.createUser(username,  password);
            console.log('new user added successfully!');
            // return newUserDTO;
        } catch (error) {
            console.error('Error adding new user: ', error);
        throw error;
    }
 }
    
    async remove (username, passwordHash, IAuthDatabasePort) {
        try {
            await IAuthDatabasePort.removeUser(username,  passwordHash, IAuthDatabasePort);
            console.log('user removed successfully!');
        } catch (error) {
            console.error('Error removing user: ', error);
        throw error;
    }
    }
    
} 

module.exports = User;
