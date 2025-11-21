// conversationsHistory.js
/* eslint-disable no-unused-vars */

'use strict';

const { v4: uuidv4 } = require('uuid');

class ConversationsHistory {
  constructor(userId) {
    this.userId = userId;
  }

  // TODO: featureee that allows smart fetching of conversations list, fetch only relevant conversations providing right arguments to the search
  async fetchConversationsHistory(IChatPersistPort) {
    const conversations = await IChatPersistPort.fetchConversationsHistory(this.userId);
    return conversations;
  }



}

module.exports = ConversationsHistory;
