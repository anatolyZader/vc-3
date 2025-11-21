'use strict';
const path = require('path');
const { EventEmitter } = require('events');

describe('AI Pub/Sub listener plugin', () => {
  let plugin;
  let fastify;
  let eventBus;

  beforeEach(() => {
    jest.resetModules();
    plugin = require(path.resolve(__dirname, '../../../../business_modules/ai/input/aiPubsubListener.js'));
    eventBus = new EventEmitter();

    const diContainer = {
      hasRegistration: jest.fn(async (name) => name === 'eventDispatcher' || name === 'pubSubClient'),
      resolve: jest.fn(async (name) => {
        if (name === 'eventDispatcher') return { eventBus };
        if (name === 'pubSubClient') {
          // Minimal Pub/Sub mock wiring (topic().subscription() with on())
          return {
            topic: () => ({ subscription: () => ({ on: jest.fn() }) }),
          };
        }
        return null;
      }),
      createScope: () => ({})
    };

    fastify = {
      diContainer,
      decorate: function (name, value) { this[name] = value; },
      log: { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() },
      httpErrors: { internalServerError: (msg) => new Error(msg) },
    };
  });

  test('wires repoPushed -> processPushedRepo and emits repoProcessed', async () => {
    fastify.processPushedRepo = jest.fn(async () => ({ success: true, chunksStored: 3 }));

    await plugin(fastify, {});

    const emitted = [];
    eventBus.on('repoProcessed', (payload) => emitted.push(payload));

    eventBus.emit('repoPushed', { payload: { userId: 'u', repoId: 'r', repoData: { k: 1 } } });

    await new Promise((r) => setTimeout(r, 0));

    expect(fastify.processPushedRepo).toHaveBeenCalledWith(
      expect.objectContaining({ body: { repoId: 'r', repoData: { k: 1 } }, user: { id: 'u' } }),
      expect.any(Object)
    );
    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual(expect.objectContaining({ userId: 'u', repoId: 'r', result: { success: true, chunksStored: 3 } }));
  });

  test('wires questionAdded -> respondToPrompt and emits answerAdded', async () => {
    fastify.respondToPrompt = jest.fn(async () => ({ response: 'hello', status: 'success' }));

    await plugin(fastify, {});

    const emitted = [];
    eventBus.on('answerAdded', (payload) => emitted.push(payload));

    eventBus.emit('questionAdded', { payload: { userId: 'u1', conversationId: 'c1', prompt: 'hi' } });
    await new Promise((r) => setTimeout(r, 0));

    expect(fastify.respondToPrompt).toHaveBeenCalled();
    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual(expect.objectContaining({ userId: 'u1', conversationId: 'c1', answer: 'hello' }));
  });
});
