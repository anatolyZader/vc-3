// textSanitizer.js - Utility for cleaning HTML entities and unwanted characters from chat input

/**
 * Sanitizes text input by removing HTML entities and normalizing whitespace
 * @param {string} text - The input text to sanitize
 * @returns {string} - The sanitized text
 */
export function sanitizeMessageText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    // Remove common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    
    // Remove zero-width characters and other invisible characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Creates a DOM parser to decode HTML entities if available
 * Falls back to manual replacement if DOM parser is not available
 * @param {string} text - The input text to decode
 * @returns {string} - The decoded text
 */
export function decodeHtmlEntities(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  try {
    // Use DOM parser if available (browser environment)
    if (typeof window !== 'undefined' && window.DOMParser) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      return doc.documentElement.textContent || '';
    }
  } catch (error) {
    console.warn('Failed to decode HTML entities using DOM parser:', error);
  }

  // Fallback to manual replacement
  return sanitizeMessageText(text);
}

/**
 * Comprehensive text cleaning for chat messages
 * @param {string} text - The input text to clean
 * @returns {string} - The cleaned text
 */
export function cleanChatText(text) {
  return sanitizeMessageText(decodeHtmlEntities(text));
}