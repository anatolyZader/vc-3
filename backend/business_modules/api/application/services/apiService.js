// apiService.js
/* eslint-disable no-unused-vars */
'use strict';

const HttpApi = require('../../domain/entities/httpApi');
const HttpApiFetchedEvent = require('../../domain/events/httpApiFetchedEvent');
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
      // Create and publish domain event
      const event = new HttpApiFetchedEvent({
        userId,
        repoId,
        spec: fetchedApi
      });
      await this.apiMessagingAdapter.publishHttpApiFetchedEvent(event);
      return fetchedApi;
    }
}

module.exports = ApiService;
