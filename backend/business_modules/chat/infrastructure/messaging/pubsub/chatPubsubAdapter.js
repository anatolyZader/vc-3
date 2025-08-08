// chatPubsubAdapter.js
'use strict';

const IChatMessagingPort = require('../../../domain/ports/IChatMessagingPort');

class ChatPubsubAdapter extends IChatMessagingPort {
constructor(dependencies) {
    super();
    
    // Extract dependenciess - this is the correct way according to docs
    const { pubSubClient, eventDispatcher } = dependencies || {};
    
    this.pubSubClient = pubSubClient;
    this.eventDispatcher = eventDispatcher;
    this.topicName = 'ai-topic';

    console.log('🔧 After assignment:', {
        hasPubSubClient: !!this.pubSubClient,
        hasEventDispatcher: !!this.eventDispatcher,
        eventDispatcherType: typeof this.eventDispatcher
    });
}

    // Generic method to publish an eventttt
    async publishEvent(eventName, payload) {
        try {
            console.log('🚀 ChatPubsubAdapter: Publishing event:', { eventName, payload });
            
            // The eventDispatcher IS the function, call it directly
            if (this.eventDispatcher && typeof this.eventDispatcher === 'function') {
                await this.eventDispatcher(eventName, payload);
                console.log(`✅ Published ${eventName} event via EventDispatcher function`);
            } else {
                console.error('❌ EventDispatcher is not a function:', {
                    hasEventDispatcher: !!this.eventDispatcher,
                    eventDispatcherType: typeof this.eventDispatcher,
                    eventDispatcherValue: this.eventDispatcher
                });
            }
        } catch (error) {
            console.error(`❌ Error publishing ${eventName} event:`, error);
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