/**
 * Utility functions for text matching and keyword detection
 */
class TextMatcher {
  /**
   * Check if text contains specific keywords
   * @param {string} text - The text to search in
   * @param {Array<string>} keywords - Array of keywords to search for
   * @returns {boolean} True if any keyword is found in the text
   */
  static containsKeywords(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check if text contains any of multiple keyword groups
   * @param {string} text - The text to search in
   * @param {Array<Array<string>>} keywordGroups - Array of keyword arrays
   * @returns {boolean} True if any keyword from any group is found
   */
  static containsAnyKeywordGroup(text, keywordGroups) {
    return keywordGroups.some(keywords => this.containsKeywords(text, keywords));
  }

  /**
   * Check if text contains all keywords from a group
   * @param {string} text - The text to search in
   * @param {Array<string>} keywords - Array of keywords that must all be present
   * @returns {boolean} True if all keywords are found in the text
   */
  static containsAllKeywords(text, keywords) {
    return keywords.every(keyword => text.includes(keyword));
  }
}

module.exports = TextMatcher;
