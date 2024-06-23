/* eslint-disable no-unused-vars */
'strict'
// user.js
const { v4: uuidv4 } = require('uuid');

class User {
  constructor(username, email, IAuthDatabasePort) {
    this.userId = uuidv4();
    this.username = username;
    this.email = email;
    this.passwordHash = '';
    this.databasePort = IAuthDatabasePort;
    }

    async register(username, email, passwordHash, IAuthDatabasePort) {
        try {
            const newUserDTO = await IAuthDatabasePort.createUser(username,  passwordHash);
            console.log('new user added successfully!');
            return newUserDTO;
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

    async login (username, passwordHash, IAuthDatabasePort) {
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

} 

module.exports = User;
