'use strict';

const path = require('path');

describe('AI application controller plugin', () => {
  let plugin;
  let fastify;
  let aiServiceMock;

  beforeEach(() => {
    jest.resetModules();
    plugin = require(path.resolve(__dirname, '../../../../business_modules/ai/application/aiController.js'));

    aiServiceMock = {
      aiAdapter: {
        setUserId: jest.fn(),
        setPersistenceAdapter: jest.fn(),
      },
      aiPersistAdapter: {},
      respondToPrompt: jest.fn().mockResolvedValue('OK'),
      processPushedRepo: jest.fn().mockResolvedValue({ success: true, chunksStored: 2 }),
    };

    const scope = { resolve: jest.fn().mockResolvedValue(aiServiceMock) };

    fastify = {
      decorate: function (name, value) { this[name] = value; },
      diContainer: { createScope: () => scope },
      httpErrors: { internalServerError: (msg) => new Error(msg) },
      log: { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() },
    };
  });

  test('respondToPrompt returns success payload and calls service with user, conversation, prompt', async () => {
    await plugin(fastify, {});

    const req = {
      body: { conversationId: 'c1', prompt: 'Hello' },
      user: { id: 'u1' },
    };
    const reply = {};

    const res = await fastify.respondToPrompt(req, reply);

    expect(aiServiceMock.respondToPrompt).toHaveBeenCalledWith('u1', 'c1', 'Hello');
    expect(aiServiceMock.aiAdapter.setUserId).toHaveBeenCalledWith('u1');
    expect(aiServiceMock.aiAdapter.setPersistenceAdapter).toHaveBeenCalledWith(aiServiceMock.aiPersistAdapter);
    expect(res).toEqual(expect.objectContaining({ response: 'OK', status: 'success', timestamp: expect.any(String) }));
  });

  test('processPushedRepo calls service with user, repoId, repoData', async () => {
    await plugin(fastify, {});

    const req = {
      body: { repoId: 'org/repo', repoData: { key: 'val' } },
      user: { id: 'u2' },
    };
    const reply = {};

    const res = await fastify.processPushedRepo(req, reply);

    expect(aiServiceMock.processPushedRepo).toHaveBeenCalledWith('u2', 'org/repo', { key: 'val' });
    expect(res).toEqual({ success: true, chunksStored: 2 });
  });

  test('manualProcessRepoDirect constructs repoData from repoId and calls service', async () => {
    await plugin(fastify, {});

    const req = {
      body: { repoId: 'octo/demo' },
      user: { id: 'user-123' },
    };
    const reply = {};

    const res = await fastify.manualProcessRepoDirect(req, reply);

    expect(aiServiceMock.processPushedRepo).toHaveBeenCalledWith(
      'user-123',
      'octo/demo',
      expect.objectContaining({ githubOwner: 'octo', repoName: 'demo', repoUrl: 'https://github.com/octo/demo', branch: 'main' })
    );
    expect(res).toEqual(expect.objectContaining({ success: true, message: expect.any(String), repoId: 'octo/demo' }));
  });
});
