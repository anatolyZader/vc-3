'use strict';
const path = require('path');

describe('AI router plugin', () => {
  let plugin;
  let fastify;

  beforeEach(() => {
    jest.resetModules();
    plugin = require(path.resolve(__dirname, '../../../../business_modules/ai/input/aiRouter.js'));

    fastify = {
      routes: [],
      verifyToken: jest.fn(),
      respondToPrompt: jest.fn(),
      processPushedRepo: jest.fn(),
      manualProcessRepoDirect: jest.fn(),
      route: function (def) { this.routes.push(def); },
    };
  });

  test('registers three POST routes with handlers and schemas', async () => {
    await plugin(fastify, {});

    const urls = fastify.routes.map(r => r.url);
    expect(urls).toContain('/respond');
    expect(urls).toContain('/process-pushed-repo');
    expect(urls).toContain('/manual-process-repo-direct');

    const respond = fastify.routes.find(r => r.url === '/respond');
    expect(respond.method).toBe('POST');
    expect(respond.preValidation).toEqual(expect.arrayContaining([fastify.verifyToken]));
    expect(respond.handler).toBe(fastify.respondToPrompt);
    expect(respond.schema).toBeDefined();

    const process = fastify.routes.find(r => r.url === '/process-pushed-repo');
    expect(process.handler).toBe(fastify.processPushedRepo);

    const manual = fastify.routes.find(r => r.url === '/manual-process-repo-direct');
    expect(manual.handler).toBe(fastify.manualProcessRepoDirect);
  });
});
