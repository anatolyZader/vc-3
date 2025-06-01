// httpApi.js
'use strict';

class HttpApi {
  constructor(userId, repoId) {
    this.userId = userId;
    this.repoId = repoId;
  }

  async fetchHttpApi(userId, repoId, IApiPersistPort) {
    const httpApi = await IApiPort.fetchHttpApi(this.userId, this.repoId);
    await IApiPersistPort.saveHttpApi(this.userId, this.repoId, httpApi);
    console.log(`HTTP API fetched for repo: ${repoId}`);
    return httpApi; 
  }

}

module.exports = HttpApi;