// conversation.js
/* eslint-disable no-unused-vars */


const { v4: uuidv4 } = require('uuid');

class Conversation {
  constructor(userId, conversationId = null) {
    this.userId = userId;
    this.conversationId = conversationId || uuidv4();
    this.messages = [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  async startConversation(IChatPersistPort, title = 'New Chat') {
    this.conversationId = uuidv4();
    this.createdAt = new Date();
    this.updatedAt = new Date();
    
    await IChatPersistPort.startConversation(this.userId, title, this.conversationId);
    
    console.log(`[${new Date().toISOString()}] Conversation started: ${this.conversationId} for user: ${this.userId}`);
    return this.conversationId; 
  }

  async fetchConversation(conversationId, IChatPersistPort) {
    this.conversationId = conversationId;
    const conversation = await IChatPersistPort.fetchConversation(this.userId, conversationId);
    this.messages = conversation;
    return conversation;
  }

  async renameConversation(conversationId, newTitle, IChatPersistPort) {
    this.updatedAt = new Date();
    
    await IChatPersistPort.renameConversation(this.userId, conversationId, newTitle);
    
    console.log(`[${new Date().toISOString()}] Conversation renamed to: ${newTitle}`);
  }

  /**
   * Generate a concise 5-word title from the first 3 user prompts
   * using the provided AI port, then persist it via the persistence port.
   */
  async nameConversation(conversationId, IChatPersistPort, IChatAiPort) {
    if (!conversationId) throw new Error('conversationId is required');
    if (!IChatPersistPort) throw new Error('IChatPersistPort is required');
    if (!IChatAiPort) throw new Error('IChatAiPort is required');

    this.conversationId = conversationId;

    // Fetch conversation to get messages if not already set
    let conversation = null;
    try {
      conversation = await IChatPersistPort.fetchConversation(this.userId, conversationId);
    } catch (e) {
      console.warn(`[${new Date().toISOString()}] Failed to fetch conversation for titling:`, e?.message);
    }

    // Support both shapes: object with messages[] or array of messages
    const msgs = Array.isArray(conversation)
      ? conversation
      : (conversation && Array.isArray(conversation.messages) ? conversation.messages : this.messages || []);

    const userPrompts = msgs
      .filter(m => (m && (m.role === 'user' || m.role === 'USER')))
      .slice(0, 3)
      .map(m => (m.text || m.content || '').toString().trim())
      .filter(Boolean);

    // If no prompts yet, keep a safe default
    if (userPrompts.length === 0) {
      const fallback = 'New Conversation';
      await IChatPersistPort.renameConversation(this.userId, conversationId, fallback);
      this.updatedAt = new Date();
      console.log(`[${new Date().toISOString()}] No prompts found, set default title: ${fallback}`);
      return fallback;
    }

    // Ask AI to name the conversation
    let rawTitle = await IChatAiPort.nameConversation({
      userId: this.userId,
      conversationId,
      prompts: userPrompts
    });

    if (!rawTitle || typeof rawTitle !== 'string') {
      rawTitle = 'Untitled Chat';
    }

    // Normalize to max 5 words and trim unwanted characters
    const sanitized = rawTitle
      .replace(/[\n\r\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const words = sanitized.split(' ');
    const limited = words.slice(0, 5).join(' ').trim();
    const finalTitle = limited.length ? limited : 'Untitled Chat';

    await IChatPersistPort.renameConversation(this.userId, conversationId, finalTitle);
    this.updatedAt = new Date();
    console.log(`[${new Date().toISOString()}] Conversation auto-titled: ${finalTitle}`);
    return finalTitle;
  }

  async deleteConversation(conversationId, IChatPersistPort) {
    await IChatPersistPort.deleteConversation(this.userId, conversationId);
    console.log(`[${new Date().toISOString()}] Conversation deleted: ${conversationId}`);
  }

  async addQuestion(conversationId, prompt, IChatPersistPort) {
    const messageId = await IChatPersistPort.addQuestion(this.userId, conversationId, prompt);
    
    console.log(`[${new Date().toISOString()}] Question added: ${messageId}`);
    return messageId;
  }

  async addAnswer(conversationId, answer, IChatPersistPort) {
    // Handle both string and object answers
    const answerContent = typeof answer === 'string' ? answer : answer.content || answer.response || answer;
    
    const messageId = await IChatPersistPort.addAnswer(this.userId, conversationId, answerContent);
    
    console.log(`[${new Date().toISOString()}] Answer added: ${messageId}`);
    return messageId;
  }

  equals(other) {
    if (!(other instanceof Conversation)) return false;
    return (
      this.conversationId === other.conversationId &&
      this.userId === other.userId
    );
  }
}

module.exports = Conversation;