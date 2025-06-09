// conversationsHistory.js
/* eslint-disable no-unused-vars */

'use strict';

const { v4: uuidv4 } = require('uuid');

class ConversationsHistory {
  constructor(userId) {
    this.userId = userId;
  }

  // TODO: feature that allows smart fetching of conversations list, fetch only relevant conversations providing right arguments to the search
  async fetchConversationsHistory(IChatPersistPort) {
    const conversations = await IChatPersistPort.fetchConversationsHistory(this.userId);
    return conversations;
  }


  // async searchInConversations(query, IChatPersistPort) {
  //   const searchResult = await IChatPersistPort.searchInConversations(this.userId, query);  
  //   if (searchResult.length > 0) {
  //     console.log(`Found ${searchResult.length} conversation(s) matching the query "${query}".`);
  //     return searchResult;
  //   } else {
  //     console.log(`No conversations found matching the query "${query}".`);
  //     return [];
  //   }
  // }
}

module.exports = ConversationsHistory;
