'use strict';
const path = require('path');
const { EventEmitter } = require('events');

describe('AI Pub/Sub listener - GCP Pub/Sub bridge', () => {
  let plugin;
  let fastify;
  let eventBus;
  let subscriptionMock;
  let subscriptionFn;
  let topicSpy;
  let capturedHandlers;

  beforeEach(() => {
    jest.resetModules();
    plugin = require(path.resolve(__dirname, '../../../../business_modules/ai/input/aiPubsubListener.js'));
    eventBus = new EventEmitter();
    capturedHandlers = {};

    subscriptionMock = {
      on: jest.fn((event, handler) => {
        capturedHandlers[event] = handler;
      })
    };

  subscriptionFn = jest.fn(() => subscriptionMock);
  topicSpy = jest.fn(() => ({ subscription: subscriptionFn }));
  const pubSubClient = { topic: topicSpy };

    const diContainer = {
      hasRegistration: jest.fn(async (name) => name === 'eventDispatcher'),
      resolve: jest.fn(async (name) => {
        if (name === 'eventDispatcher') return { eventBus };
        if (name === 'pubSubClient') return pubSubClient;
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

  test('uses expected topic and subscription names', async () => {
    await plugin(fastify, {});
  expect(fastify.diContainer.resolve).toHaveBeenCalledWith('pubSubClient');
  expect(fastify.diContainer.resolve).toHaveBeenCalledWith('eventDispatcher');
  expect(fastify.diContainer.resolve).toHaveBeenCalledTimes(2);
  // Assert topic and subscription names
  expect(topicSpy).toHaveBeenCalledWith('git-topic');
    expect(subscriptionFn).toHaveBeenCalledWith('git-sub');
  });

  test('forwards GCP message with event to internal eventBus', async () => {
    await plugin(fastify, {});

    expect(typeof capturedHandlers.message).toBe('function');
    const onQuestionAdded = jest.fn();
    eventBus.on('questionAdded', onQuestionAdded);

    const message = {
      id: 'm1',
      data: Buffer.from(JSON.stringify({ event: 'questionAdded', payload: { userId: 'u1', conversationId: 'c1', prompt: 'hi' } })),
      ack: jest.fn(),
      nack: jest.fn()
    };

    await capturedHandlers.message(message);

    expect(onQuestionAdded).toHaveBeenCalledTimes(1);
    expect(onQuestionAdded.mock.calls[0][0]).toEqual({ userId: 'u1', conversationId: 'c1', prompt: 'hi' });
    expect(message.ack).toHaveBeenCalledTimes(1);
  });

  test('falls back to repoPushed when event is missing', async () => {
    await plugin(fastify, {});

    expect(typeof capturedHandlers.message).toBe('function');
    const onRepoPushed = jest.fn();
    eventBus.on('repoPushed', onRepoPushed);

    const payload = { userId: 'u2', repoId: 'r2' };
    const message = {
      id: 'm2',
      data: Buffer.from(JSON.stringify(payload)),
      ack: jest.fn(),
      nack: jest.fn()
    };

    await capturedHandlers.message(message);

    expect(onRepoPushed).toHaveBeenCalledTimes(1);
    expect(onRepoPushed.mock.calls[0][0]).toEqual(payload);
    expect(message.ack).toHaveBeenCalledTimes(1);
  });
});
