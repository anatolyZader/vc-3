// chatMessagingAdapter.js
/* eslint-disable no-unused-vars */
'use strict';

class IChatMessagingPort {
  constructor() {
    if (new.target === IChatMessagingPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }
  
  async addQuestion(question) {
    throw new Error('Method not implemented.');
  }
}

module.exports = IChatMessagingPort;
