'strict'
// user.js
const { v4: uuidv4 } = require('uuid');
// const IAuthPersistencePort = require('../ports/IAuthPersistencePort')
class User {
  constructor(username, email) {
    this.userId = uuidv4();
    this.username = username;
    this.email = email;
    this.password = '';
    this.accounts = [];
    this.roles = '';
    }

    async register(username, email, password, IAuthPersistencePort) {
        try {
            const newUserDTO = await IAuthPersistencePort.createUser(username, email, password);
            console.log(`hello user.js! new user added successfully with following credentials: ${newUserDTO}`);
            return newUserDTO;
        } catch (error) {
            console.error('Error adding new user: ', error);
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
    
    async removeUser (email, password, IAuthPersistencePort) {
        try {
            await IAuthPersistencePort.removeUser(email,  password);
            console.log('user removed successfully!');
        } catch (error) {
            console.error('Error removing user: ', error);
        throw error;
    }
    }



// --------------------------------------------------------------------------------------






    
} 

module.exports = User;
