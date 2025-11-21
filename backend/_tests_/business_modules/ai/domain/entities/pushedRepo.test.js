const PushedRepo = require('../../../../../business_modules/ai/domain/entities/pushedRepo');
const UserId = require('../../../../../business_modules/ai/domain/value_objects/userId');
const RepoId = require('../../../../../business_modules/ai/domain/value_objects/repoId');

describe('PushedRepo Entity', () => {
  class MockPort { async processPushedRepo(uid, rid, data){ return 'ok'; } }
  test('processPushedRepo returns response and event', async () => {
    const u = new UserId('u1');
    const r = new RepoId('r1');
    const entity = new PushedRepo(u, r);
    const { response, event } = await entity.processPushedRepo(u, r, { x:1 }, new MockPort());
    expect(response).toBe('ok');
    expect(event.repoId).toBe('r1');
  });
});
