// userService.js
/* eslint-disable no-unused-vars */
'use strict';
const User = require('../../domain/entities/user');
const IUserService = require('./interfaces/IUserService');

/**
 * UserService - CONCRETE IMPLEMENTATION of IUserService interface
 * 
 * This class implements all authentication-related business logic.
 * All methods below are FULLY IMPLEMENTED (not abstract).
 * 
 * Implemented Methods:
 * - loginWithGoogle(accessToken): OAuth2 Google authentication
 * - readAllUsers(): Retrieves all users from persistence layer
 * - registerUser(username, email, password): Creates new user account
 * - removeUser(email): Deletes user by email
 * - getUserInfo(email): Fetches user details by email
 */
class UserService extends IUserService {
  constructor({authPersistAdapter}) {
    super(); 
    this.User = User;
    this.authPersistAdapter = authPersistAdapter;
  }

  async loginWithGoogle(accessToken) {
    try {
      // 1) Fetch user info from Google using the access token
      //    The "alt=json" ensures JSON response
      const url = `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${accessToken}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Google userinfo request failed:', await response.text());
        return null; // Return null to indicate verification failure
      }

      const googleProfile = await response.json();
      // googleProfile might contain { email, verified_email, name, picture, ... }

      // 2) Basic checks
      if (!googleProfile.email) {
        console.error('No email found in Google profile:', googleProfile);
        return null;
      }
      // Optionally check verified_email if present
      // if (googleProfile.verified_email === false) return null;

      // 3) See if we already have a user with this email
      let user = await this.getUserInfo(googleProfile.email);
      if (!user) {
        // Create a new user
        const username = googleProfile.name || googleProfile.email.split('@')[0];
        user = await this.registerUser(username, googleProfile.email, 'placeholder-google-pass');
      }

      // 4) Return user object, optionally add user.picture from googleProfile
      //    If your DB model has a "picture" field, you might store it there
      return {
        ...user,
        picture: googleProfile.picture,
      };
    } catch (error) {
      console.error('Error in loginWithGoogle:', error);
      return null; 
    }
  }
  
  async readAllUsers() {
    try {
      const users = await this.authPersistAdapter.readAllUsers();
      console.log('Users retrieved successfully:', users);
      return users;
    } catch (error) {
      console.error('Error retrieving users:', error);
      throw error;
    }
  }

  async registerUser(username, email, password) {
    try {
      const userInstance = new this.User();
      const newUser = await userInstance.registerUser(username, email, password, this.authPersistAdapter);
      console.log('User registered successfully:', newUser);
      return newUser;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  async removeUser(email) {
    try {
      const userInstance = new this.User();
      console.log('userInstance instantiated at userService removeUser method: ', userInstance);
      await userInstance.removeUser(email, this.authPersistAdapter);
      console.log('User removed successfully');
    } catch (error) {
      console.error('Error removing user:', error);
      throw error;
    }
  }

  async getUserInfo(email) {
    try {
      const userInstance = new this.User();
      const userData = await userInstance.getUserInfo(email, this.authPersistAdapter);
      console.log('User retrieved successfully:', userData);
      return userData;
    } catch (error) {
      console.error('Error reading user:', error);
      throw error;
    }
  }
}

module.exports = UserService;
