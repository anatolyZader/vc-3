'use strict';
const path = require('path');

jest.mock('../../../../business_modules/ai/input/schemas/respondToPromptSchema.js', () => ({ $id: 'wrong-id', type: 'object' }), { virtual: true });
jest.mock('../../../../business_modules/ai/input/schemas/processPushedRepoSchema.js', () => ({ $id: 'also-wrong', type: 'object' }), { virtual: true });

describe('AI Schemas plugin', () => {
  let plugin;
  let fastify;
  beforeEach(() => {
    jest.resetModules();
    plugin = require(path.resolve(__dirname, '../../../../business_modules/ai/plugins/aiSchemasPlugin.js'));
    const schemas = new Map();
    fastify = {
      addSchema: (s) => schemas.set(s.$id, s),
      getSchema: (id) => schemas.get(id),
      log: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
      httpErrors: { internalServerError: (m) => new Error(m) },
    };
  });

  test('loads schemas and normalizes $id to expected ids', async () => {
    await plugin(fastify, {});
    const ids = [
      'schema:ai:respond-to-prompt',
      'schema:ai:process-pushed-repo',
    ];
    ids.forEach((id) => {
      const s = fastify.getSchema(id);
      expect(s).toBeDefined();
      expect(s.$id).toBe(id);
      expect(s.type).toBe('object');
    });
  });
});
