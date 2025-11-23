'use strict';
const path = require('path');
const { EventEmitter } = require('events');

describe('AI Pub/Sub listener - Internal Event Bridge', () => {
  let plugin;
  let fastify;
  let eventBus;

  beforeEach(() => {
    jest.resetModules();
    plugin = require(path.resolve(__dirname, '../../../../business_modules/ai/input/aiPubsubListener.js'));
    eventBus = new EventEmitter();

    fastify = {
      eventDispatcher: { 
        eventBus, 
        subscribe: jest.fn((event, handler) => eventBus.on(event, handler)),
        emitInternal: jest.fn((eventName, payload) => eventBus.emit(eventName, payload))
      },
      transport: { subscribe: jest.fn() },
      diContainer: { createScope: jest.fn(() => ({})) },
      processPushedRepo: jest.fn(async () => ({ success: true, chunksStored: 3 })),
      respondToPrompt: jest.fn(async () => ({ response: 'test answer' })),
      decorate: function (name, value) { this[name] = value; },
      log: { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() },
      httpErrors: { internalServerError: (msg) => new Error(msg) },
    };
  });

  test('registers internal event listeners for repoPushed and questionAdded', async () => {
    await plugin(fastify, {});
    
    // Verify that subscribe was called for internal events
    expect(fastify.eventDispatcher.subscribe).toHaveBeenCalledWith('repoPushed', expect.any(Function));
    expect(fastify.eventDispatcher.subscribe).toHaveBeenCalledWith('questionAdded', expect.any(Function));
    
    // Verify transport subscribe was called for external messaging (uses git-events, not ai-events-internal)
    expect(fastify.transport.subscribe).toHaveBeenCalledWith('git-events', expect.any(Function));
  });

  test('handles repoPushed event and processes repo', async () => {
    await plugin(fastify, {});

    // Emit repoPushed event directly to event bus 
    const repoData = { userId: 'u1', repoId: 'r1', repoData: { name: 'test-repo' } };
    eventBus.emit('repoPushed', repoData);

    await new Promise(resolve => setImmediate(resolve)); // Allow async processing

    // The AI listener calls processPushedRepo with a request object structure
    expect(fastify.processPushedRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { id: repoData.userId },
        body: expect.objectContaining({
          repoId: repoData.repoId,
          repoData: repoData.repoData
        })
      }),
      expect.any(Object) // reply object
    );
  });

  test('handles questionAdded event and responds to prompt', async () => {
    await plugin(fastify, {});

    // Emit questionAdded event directly to event bus
    const questionData = { userId: 'u1', conversationId: 'c1', prompt: 'Hello?' };
    eventBus.emit('questionAdded', questionData);

    await new Promise(resolve => setImmediate(resolve)); // Allow async processing

    // The handler calls respondToPrompt with request/reply pattern, not direct args
    expect(fastify.respondToPrompt).toHaveBeenCalled();
  });
});
