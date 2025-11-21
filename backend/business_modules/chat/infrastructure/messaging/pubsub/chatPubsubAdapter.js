// chatPubsubAdapter.js
'use strict';

const IChatMessagingPort = require('../../../domain/ports/IChatMessagingPort');

class ChatPubsubAdapter extends IChatMessagingPort {
  constructor(dependencies) {
    super();
    
    const { transport, eventDispatcher, logger } = dependencies || {};
    
    this.transport = transport;
    this.eventDispatcher = eventDispatcher;
    this.log = logger;
    this.topicName = require('../../../../../messageChannels').getChannelName('chat');

    this.log.debug({ hasTransport: !!this.transport, hasEventDispatcher: !!this.eventDispatcher }, 'ChatPubsubAdapter initialized');
  }

  // Generic method to publish an event
  async publishEvent(eventName, payload) {
    try {
      this.log.info({ eventName, payload }, 'ChatPubsubAdapter: Publishing event');
      
      // Use eventDispatcher.emitInternal for in-process events
      if (this.eventDispatcher && typeof this.eventDispatcher.emitInternal === 'function') {
        this.eventDispatcher.emitInternal(eventName, payload);
        this.log.info({ eventName }, 'Published internal event via EventDispatcher');
      } else if (this.eventDispatcher && typeof this.eventDispatcher === 'function') {
        // Legacy fallback
        await this.eventDispatcher(eventName, payload);
        this.log.info({ eventName }, 'Published event via EventDispatcher function (legacy)');
      } else {
        this.log.error({ hasEventDispatcher: !!this.eventDispatcher, type: typeof this.eventDispatcher }, 'EventDispatcher is not available');
      }
    } catch (error) {
      this.log.error({ eventName, error }, 'Error publishing event');
      throw error;
    }
  }

  // Specific methods remain the same
  async startConversation(payload) {
    return this.publishEvent('conversationStarted', payload);
  }

    async addQuestion(payload) {
        return this.publishEvent('questionAdded', payload);
    }

    async addAnswer(payload) {
        return this.publishEvent('answerAdded', payload);
    }

    async renameConversation(payload) {
        return this.publishEvent('conversationRenamed', payload);
    }

    async deleteConversation(payload) {
        return this.publishEvent('conversationDeleted', payload);
    }
}

module.exports = ChatPubsubAdapter;