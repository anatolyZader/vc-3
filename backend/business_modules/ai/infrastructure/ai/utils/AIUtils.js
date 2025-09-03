/**
 * Utility functions for AI operations
 */
class AIUtils {
  /**
   * Format conversation history for LangChain
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

  /**
   * Check if text contains specific keywords
   */
  static containsKeywords(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
  }
}

module.exports = AIUtils;
