// conversationsHistory.js
/* eslint-disable no-unused-vars */

// isolate between functionality 1) the names of the conversations are fetched to be presented in  
// // the chat history and 2) the whole conversation is fetched to be presented in the chat window

'use strict';

const { v4: uuidv4 } = require('uuid');

class ConversationHistory {
  constructor(userId) {
    this.userId = userId;
  }

  async fetchConversation(IChatPersistPort) {
    const conversation = await IChatPersistPort.fetchConversation(this.userId);
    return conversation;
  }

  // TODO: feature that allows smart fetching of conversations list, fetch only relevant conversations providing right arguments to the search
  async fetchConversationsList (IChatPersistPort) {
    const conversations = await IChatPersistPort.fetchConversations(this.userId);
    return conversations;
  }

  async deleteConversation(conversationId, IChatPersistPort) {
    await IChatPersistPort.deleteConversation(conversationId);
    console.log(`Conversation ${conversationId} removed from history for user ${this.userId}.`)   
  }

  // Searches for a conversation based on title or other properties
  async searchInConversations(query, IChatPersistPort) {
    const searchResult = await IChatPersistPort.searchInConversations(this.userId, query);  
    if (searchResult.length > 0) {
      console.log(`Found ${searchResult.length} conversation(s) matching the query "${query}".`);
      return searchResult;
    } else {
      console.log(`No conversations found matching the query "${query}".`);
      return [];
    }
  }
}

module.exports = ConversationHistory;
