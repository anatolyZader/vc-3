'use strict';

const path = require('path');
const Fastify = require('fastify');

describe('AI Controller + Router (Fastify inject)', () => {
  const aiControllerPath = path.resolve(
    __dirname,
    '../../../../business_modules/ai/application/aiController.js'
  );
  const aiRouterPath = path.resolve(
    __dirname,
    '../../../../business_modules/ai/input/aiRouter.js'
  );

  function build(appMocks = {}) {
    const fastify = Fastify();

    // Minimal httpErrors support via @fastify/sensible
    // But to keep it light, emulate needed parts
    fastify.decorate('httpErrors', {
      internalServerError: (msg) => new Error(msg)
    });

    // PreValidation verifyToken stub: inject user and di scope
    fastify.decorate('verifyToken', (req, _reply, done) => {
      req.user = { id: appMocks.userId || 'user-1' };
      // Provide diScope expected by controller
      req.diScope = {
        resolve: jest.fn().mockResolvedValue(appMocks.aiServiceMock)
      };
      done();
    });

    // Provide a minimal diContainer in case controller checks it
    fastify.decorate('diContainer', {
      createScope: () => ({ resolve: jest.fn().mockResolvedValue(appMocks.aiServiceMock) })
    });

    return fastify;
  }

  test('POST /respond returns success with response body', async () => {
    const aiServiceMock = {
      aiAdapter: {
        setUserId: jest.fn(),
        setPersistenceAdapter: jest.fn(),
      },
      aiPersistAdapter: {},
      respondToPrompt: jest.fn().mockResolvedValue('OK-RESP')
    };

    const fastify = build({ aiServiceMock, userId: 'u1' });
    await fastify.register(require(aiControllerPath));
    await fastify.register(require(aiRouterPath));
    await fastify.ready();

    const res = await fastify.inject({
      method: 'POST',
      url: '/respond',
      payload: { conversationId: 'c1', prompt: 'Hello' }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toEqual(expect.objectContaining({ status: 'success', response: 'OK-RESP', timestamp: expect.any(String) }));
    expect(aiServiceMock.respondToPrompt).toHaveBeenCalledWith('u1', 'c1', 'Hello');
  });

  test('POST /process-pushed-repo proxies to service', async () => {
    const aiServiceMock = {
      processPushedRepo: jest.fn().mockResolvedValue({ success: true, chunksStored: 3 })
    };

    // Controller checks adapter when present; keep minimal mock
    const fastify = build({ aiServiceMock, userId: 'user-2' });
    await fastify.register(require(aiControllerPath));
    await fastify.register(require(aiRouterPath));
    await fastify.ready();

    const res = await fastify.inject({
      method: 'POST',
      url: '/process-pushed-repo',
      payload: { repoId: 'org/repo', repoData: { x: 1 } }
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true, chunksStored: 3 });
    expect(aiServiceMock.processPushedRepo).toHaveBeenCalledWith('user-2', 'org/repo', { x: 1 });
  });

  test('POST /manual-process-repo-direct constructs repoData and calls service', async () => {
    const aiServiceMock = {
      processPushedRepo: jest.fn().mockResolvedValue({ ok: 1 })
    };
    const fastify = build({ aiServiceMock, userId: 'user-3' });
    await fastify.register(require(aiControllerPath));
    await fastify.register(require(aiRouterPath));
    await fastify.ready();

    const res = await fastify.inject({
      method: 'POST',
      url: '/manual-process-repo-direct',
      payload: { repoId: 'octo/demo' }
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toEqual(expect.objectContaining({ success: true, repoId: 'octo/demo' }));
    expect(aiServiceMock.processPushedRepo).toHaveBeenCalledWith(
      'user-3',
      'octo/demo',
      expect.objectContaining({ githubOwner: 'octo', repoName: 'demo', repoUrl: 'https://github.com/octo/demo', branch: 'main' })
    );
  });
});
