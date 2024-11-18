/* eslint-disable no-unused-vars */
'use strict';
const { v4: uuidv4 } = require('uuid');

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
      console.log(`hello user.js! new user added successfully with the following credentials: ${newUserDTO}`);
      return newUserDTO;
    } catch (error) {
      console.error('Error adding new user: ', error);
      throw error;
    }
  }

  async readUser(username, IAuthPersistencePort) {
    try {
      const userDTO = await IAuthPersistencePort.readUser(username);
      console.log('User read successfully:', userDTO);
      return userDTO;
    } catch (error) {
      console.error('Error reading user:', error);
      throw error;
    }
  }

  async removeUser(username, password, IAuthPersistencePort) {
    try {
      await IAuthPersistencePort.removeUser(username, password);
      console.log('User removed successfully!');
    } catch (error) {
      console.error('Error removing user: ', error);
      throw error;
    }
  }

  // New Functionality
  async verifyGoogleToken(token) {
    try {
      const googleUser = await someGoogleVerificationLibrary.verifyToken(token);
      console.log('Google token verified successfully:', googleUser);
      return googleUser;
    } catch (error) {
      console.error('Error verifying Google token:', error);
      throw error;
    }
  }

  generateVerificationCode() {
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit code
      console.log('Verification code generated:', code);
      return code;
    } catch (error) {
      console.error('Error generating verification code:', error);
      throw error;
    }
  }

  async sendCodeViaEmail(email, code) {
    try {
      await someEmailService.sendEmail({
        to: email,
        subject: 'Your Verification Code',
        text: `Your verification code is: ${code}`,
      });
      console.log(`Verification code sent to ${email}`);
    } catch (error) {
      console.error('Error sending verification code:', error);
      throw error;
    }
  }

  refreshToken(user) {
    try {
      const newToken = someJwtLibrary.sign(
        { id: user.id, username: user.username },
        {
          jwtid: uuidv4(),
          expiresIn: '1h', // Customize expiration as needed
        }
      );
      console.log('Token refreshed successfully:', newToken);
      return newToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }
}

module.exports = User;
