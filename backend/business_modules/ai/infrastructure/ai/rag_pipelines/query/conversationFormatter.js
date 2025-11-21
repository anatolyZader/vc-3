/**
 * Utility functions for conversation formatting operations
 */
class ConversationFormatter {
  /**
   * Format conversation history for LangChain
   * @param {Array} history - Array of conversation entries with prompt and response
   * @returns {Array} Formatted messages array for LangChain
   */
  static formatConversationHistory(history) {
    if (!history || history.length === 0) {
      return [];
    }

    const messages = [];
    
    history.forEach((entry) => {
      messages.push({
        role: "user",
        content: entry.prompt
      });
      
      messages.push({
        role: "assistant", 
        content: entry.response
      });
    });

    console.log(`[${new Date().toISOString()}] 🔍 CONVERSATION HISTORY: Formatted ${messages.length} messages (${messages.length / 2} exchanges) for context`);
    return messages;
  }
}

module.exports = ConversationFormatter;
