'strict'
// accountService.js

class AccountService {
  constructor({account, user, authPostgresAdapter}) {
    this.account = account;
    this.user = user;
    this.authPostgresAdapter = authPostgresAdapter;
  }

  async fetchAccountDetails(accountId, authPostgresAdapter) {
    try {
      const accountDetails = await this.account.fetchAccountDetails(accountId, authPostgresAdapter);
      return accountDetails;
    } catch (error) {
      console.error('Error fetching account details:', error);
      throw error;
    }
  }

  async addVideoToAccount(accountId, videoYoutubeId) {
    try {

      await this.account.addVideo(videoYoutubeId, accountId, this.databasePort);
    } catch (error) {
      console.error('Error adding video to account:', error);
      throw error;
    }
  }

  async removeVideoFromAccount(accountId, videoYoutubeId) {
    try {
      await this.account.removeVideo(videoYoutubeId, accountId, this.databasePort);
    } catch (error) {
      console.error('Error removing video from account:', error);
      throw error;
    }
  }
}

module.exports = AccountService;
