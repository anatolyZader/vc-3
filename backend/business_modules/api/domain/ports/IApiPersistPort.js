// IApiPersistPort.js
/* eslint-disable no-unused-vars */
'strict'

class IApiPersistPort {
    constructor() {
      if (new.target === IApiPersistPort) {
        throw new Error("Cannot instantiate an abstract class.");
      }
    }

    async saveHttpApi(userId, repoId, httpApi) {
      throw new Error("Method 'readAllUsers()' must be implemented.");
    }

    async getHttpApi(userId, repoId) {
      throw new Error("Method 'getUserInfo(userId)' must be implemented.");    
    } 
     
  }
  
  module.exports = IApiPersistPort;
  