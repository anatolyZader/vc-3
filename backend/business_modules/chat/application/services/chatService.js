// chatService.js
'use strict';
/* eslint-disable no-unused-vars */
const Conversation = require('../../domain/aggregates/conversation');
const ConversationsHistory = require('../../domain/entities/conversationsHistory');
const IChatService = require('./interfaces/IChatService');
const QuestionContent = require('../../domain/value_objects/questionContent');
let AnswerContent;
try {
  AnswerContent = require('../../domain/value_objects/answerContent');
} catch (e) {
  AnswerContent = null;
}
const ConversationId = require('../../domain/value_objects/conversationId');
const ConversationDeletedEvent = require('../../domain/events/conversationDeletedEvent');


class ChatService extends IChatService {
  constructor({chatPersistAdapter, chatMessagingAdapter, chatAiAdapter}) {
    super();
    this.chatPersistAdapter = chatPersistAdapter;
    this.chatMessagingAdapter = chatMessagingAdapter;
    this.chatAiAdapter = chatAiAdapter;
    this.topic = 'chat'; // dedicated topic for chat events
  }

  async startConversation(userId, title = 'New Conversation') {
    const conversation = new Conversation(userId);
    await conversation.startConversation( this.chatPersistAdapter, title);
    return conversation.conversationId;
  }

  async fetchConversationsHistory(userId) {
    const conversationsHistory = new ConversationsHistory(userId);
    return await conversationsHistory.fetchConversationsHistory(this.chatPersistAdapter);
  }

  async fetchConversation(userId, conversationId) {
  // Fetch from persistence adapter directly for a stable, serializable payload
  const data = await this.chatPersistAdapter.fetchConversation(userId, conversationId);
  // Ensure backward compatibility: return the plain object (router expects plain JSON)
  return data;
  }

  async addQuestion(userId, conversationId, prompt) {
    const questionContent = new QuestionContent(prompt);
    console.log(`paylod attached in chatService to the addQuestion() call to chatMessagingAdapter: userId = ${userId}, conversationId = ${conversationId} and prompt = ${questionContent.toString()}`);
    const conversation = new Conversation(userId);
    const questionId = await conversation.addQuestion(conversationId, questionContent, this.chatPersistAdapter);

    // Publish domain event: QuestionAddedEvent
    const QuestionAddedEvent = {
      eventType: 'questionAdded',
      userId,
      conversationId,
      questionId,
      prompt: questionContent.toString(),
      timestamp: new Date().toISOString()
    };
    if (this.chatMessagingAdapter && typeof this.chatMessagingAdapter.publishEvent === 'function') {
      await this.chatMessagingAdapter.publishEvent('questionAdded', QuestionAddedEvent);
    } else {
      // fallback to legacy method
      await this.chatMessagingAdapter.addQuestion({userId, conversationId, prompt: questionContent.toString()});
    }
    return questionId;
  }

  async addAnswer(userId, conversationId, answer, fromEvent = false) {
    // Use AnswerContent value object if available
    let answerContent = answer;
    if (AnswerContent) {
      answerContent = new AnswerContent(answer);
    }
    const conversation = new Conversation(userId, conversationId);
    const answerId = await conversation.addAnswer(conversationId, answerContent, this.chatPersistAdapter);
    if (!fromEvent) {
      // Publish domain event: AnswerAddedEvent
      const AnswerAddedEvent = {
        eventType: 'answerAdded',
        userId,
        conversationId,
        answerId,
        answer: answerContent.toString ? answerContent.toString() : answerContent,
        timestamp: new Date().toISOString()
      };
      if (this.chatMessagingAdapter && typeof this.chatMessagingAdapter.publishEvent === 'function') {
        await this.chatMessagingAdapter.publishEvent('answerAdded', AnswerAddedEvent);
      } else {
        await this.chatMessagingAdapter.addAnswer({userId, conversationId, answer: answerContent.toString ? answerContent.toString() : answerContent, answerId});
      }
    }
    return answerId;
  }

  async renameConversation(userId, conversationId, newTitle) {
    const conversation = new Conversation(userId);
    await conversation.renameConversation(conversationId, newTitle, this.chatPersistAdapter);
    await this.chatMessagingAdapter.renameConversation({userId, conversationId, newTitle});
    return newTitle;
  };

  async nameConversation(userId, conversationId) {
    const conversation = new Conversation(userId);
    const title = await conversation.nameConversation(
      conversationId,
      this.chatPersistAdapter,
      this.chatAiAdapter
    );
    // Publish rename event for consumers that rely on it
    if (this.chatMessagingAdapter) {
      const payload = { userId, conversationId, newTitle: title, timestamp: new Date().toISOString() };
      if (typeof this.chatMessagingAdapter.publishEvent === 'function') {
        await this.chatMessagingAdapter.publishEvent('conversationRenamed', payload);
      } else if (typeof this.chatMessagingAdapter.renameConversation === 'function') {
        await this.chatMessagingAdapter.renameConversation(payload);
      }
    }
    return title;
  }

  async deleteConversation(userId, conversationId) {
    const conversationIdVO = new ConversationId(conversationId);
    const conversation = new Conversation(userId);
    await conversation.deleteConversation(conversationIdVO.toString(), this.chatPersistAdapter);
    // Publish domain event
    const event = new ConversationDeletedEvent({
      userId,
      conversationId: conversationIdVO.toString(),
      occurredAt: new Date()
    });
    if (this.chatMessagingAdapter && typeof this.chatMessagingAdapter.publishEvent === 'function') {
      await this.chatMessagingAdapter.publishEvent('conversationDeleted', event);
    }
    return conversationIdVO.toString();
  }

}

module.exports = ChatService;