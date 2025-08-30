// scrollUtils.js - Utility functions for managing chat scroll behavior

/**
 * Smoothly scrolls the chat message list to the bottom
 * @param {boolean} smooth - Whether to use smooth scrolling (default: true)
 */
export const scrollChatToBottom = (smooth = true) => {
  // Try multiple possible selectors for the MessageList container
  const possibleSelectors = [
    '.cs-message-list__scroll-wrapper', // ChatScope scroll wrapper (most likely)
    '.cs-message-list',                 // ChatScope default
    '[data-cs-message-list]',           // ChatScope data attribute
    '.cs-message-list__content',        // ChatScope content wrapper
    '.cs-main-container__message-list', // ChatScope main container variant
    '.message-list',                    // Generic class
    '[role="log"]',                     // ARIA role
    '.chat-container .cs-message-list'  // Scoped selector
  ];
  
  let messageList = null;
  
  // Try each selector until we find the message list
  for (const selector of possibleSelectors) {
    messageList = document.querySelector(selector);
    if (messageList) {
      console.log(`Found message list with selector: ${selector}`);
      break;
    }
  }
  
  if (messageList) {
    console.log('Scrolling to bottom', { 
      scrollHeight: messageList.scrollHeight, 
      clientHeight: messageList.clientHeight,
      currentScrollTop: messageList.scrollTop 
    });
    
    messageList.scrollTo({
      top: messageList.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
  } else {
    console.warn('Message list container not found. Available elements:', 
      document.querySelectorAll('*[class*="message"], *[class*="cs-"]'));
  }
};

/**
 * Checks if the user has scrolled up from the bottom of the chat
 * @param {number} threshold - Pixels from bottom to consider as "at bottom" (default: 100)
 * @returns {boolean} - True if user is near the bottom
 */
export const isUserNearBottom = (threshold = 100) => {
  const messageList = document.querySelector('.cs-message-list__scroll-wrapper') || 
                     document.querySelector('.cs-message-list') || 
                     document.querySelector('[data-cs-message-list]') ||
                     document.querySelector('.chat-container .cs-message-list');
  
  if (!messageList) {
    console.warn('Message list not found for scroll position check');
    return true; // Default to allowing scroll if we can't find the container
  }
  
  const { scrollTop, scrollHeight, clientHeight } = messageList;
  const isNearBottom = scrollTop + clientHeight >= scrollHeight - threshold;
  
  console.log('Scroll position check:', {
    scrollTop,
    scrollHeight,
    clientHeight,
    threshold,
    isNearBottom
  });
  
  return isNearBottom;
};

/**
 * Auto-scroll that respects user interaction
 * Only scrolls if user is already near the bottom
 * @param {boolean} smooth - Whether to use smooth scrolling (default: true)
 */
export const autoScrollIfNeeded = (smooth = true) => {
  if (isUserNearBottom()) {
    scrollChatToBottom(smooth);
  }
};

/**
 * Scroll callback for typewriter animation
 * Uses gentle auto-scrolling that won't interfere with user scrolling
 */
export const onTypewriterScroll = () => {
  console.log('TypewriterScroll callback triggered');
  // Use a small delay to ensure DOM updates are complete
  requestAnimationFrame(() => {
    autoScrollIfNeeded(true);
  });
};
