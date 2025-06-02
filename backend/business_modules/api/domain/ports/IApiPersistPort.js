// IApiPersistPort.js
/* eslint-disable no-unused-vars */
'use strict'

class IApiPersistPort {
    constructor() {
      if (new.target === IApiPersistPort) {
        throw new Error("Cannot instantiate an abstract class.");
      }
    }

    async saveHttpApi(userId, repoId, httpApi) {
      throw new Error("Method 'saveHttpApi()' must be implemented.");
    }

    async getHttpApi(userId, repoId) {
      throw new Error("Method 'getHttpApi()' must be implemented.");    
    } 
     
  }
  
  module.exports = IApiPersistPort;
  