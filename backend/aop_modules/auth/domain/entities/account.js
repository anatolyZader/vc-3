'use strict';

const { v4: uuidv4 } = require('uuid');

class Account {
  constructor(userId, IAuthPersistPort) {
    this.accountId = uuidv4();
    this.userId = userId;
    this.createdAt = new Date();
    this.IAuthPersistPort = IAuthPersistPort;
    this.videos = [];
    this.accountType = 'standard'; // Default account type
  }

  async createAccount() {
    try {
      await this.IAuthPersistPort.saveAccount(this);
      console.log('Account created successfully.');
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }

  async fetchAccountDetails(accountId) {
    try {
      const accountData = await this.IAuthPersistPort.fetchAccountDetails(accountId);
      Object.assign(this, accountData); // Update instance properties
      return accountData;
    } catch (error) {
      console.error('Error fetching account details:', error);
      throw error;
    }
  }

  async addVideo(videoYoutubeId) {
    try {
      await this.IAuthPersistPort.addVideoToAccount(this.accountId, videoYoutubeId);
      console.log('Video added successfully to account.');
    } catch (error) {
      console.error('Error adding video to account:', error);
      throw error;
    }
  }

  async removeVideo(videoYoutubeId) {
    try {
      await this.IAuthPersistPort.removeVideo(this.accountId, videoYoutubeId);
      console.log('Video removed successfully from account.');
    } catch (error) {
      console.error('Error removing video from account:', error);
      throw error;
    }
  }
}

module.exports = Account;
