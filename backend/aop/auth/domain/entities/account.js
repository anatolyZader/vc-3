'strict'
// account.js

const { v4: uuidv4 } = require('uuid');

class Account {
  constructor(userId, userName,  IAuthPersistencePort) {
    this.accountId = uuidv4();
    this.userId = userId;
    this.createdAt = new Date();
    this.IAuthPersistencePort = IAuthPersistencePort;
    this.videos = [];
    this.createAccount(); // Automatically create account when Account object is instantiated
  }



  async fetchAccountDetails(accountId, IAuthPersistencePort) {
    try {
      const accountData = await IAuthPersistencePort.fetchAccountDetails(accountId);
      if (accountData) {
        this.accountType = accountData.accountType;
        this.createdAt = accountData.createdAt;
        return accountData;
      }
      return null;
    } catch (error) {
      console.error('Error fetching account details:', error);
      throw error;
    }
  }

  async addVideo(videoYoutubeId, accountId, databasePort) {
    try {
      // Assuming there's a method in databasePort to add a video to an account
      await databasePort.addVideoToAccount(accountId, videoYoutubeId);
      console.log('Video added successfully to account!');
    } catch (error) {
      console.error('Error adding video to account:', error);
      throw error;
    }
  }

  async removeVideo(videoYoutubeId, accountId, databasePort) {
    try {
      // Assuming there's a method in databasePort to add a video to an account
      await databasePort.removeVideo(accountId, videoYoutubeId);
      console.log(`Video successfully removed from  account!`);
    } catch (error) {
      console.error('Error removing video from account:', error);
      throw error;
    }
  }

}


module.exports = Account;
