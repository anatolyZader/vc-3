// apiService.js
/* eslint-disable no-unused-vars */
'use strict';

const HttpApi = require('../../domain/entities/httpApi');
const IApiService = require('./interfaces/IApiService');

class ApiService extends IApiService {
  constructor({ apiAdapter, apiPersistAdapter, apiMessagingAdapter,}) {
    super();
    this.apiAdapter = apiAdapter;
    this.apiPersistAdapter = apiPersistAdapter;    
    this.apiMessagingAdapter = apiMessagingAdapter;  
  }

  async fetchHttpApi(userId, repoId) {
      const apiObj = new HttpApi(userId, repoId);
      const fetchedApi = await apiObj.fetchHttpApi(this.apiAdapter, this.apiPersistAdapter);
      await this.apiMessagingAdapter.publishHttpApiFetchedEvent(fetchedApi);
      return fetchedApi;
    }
}

module.exports = ApiService;
