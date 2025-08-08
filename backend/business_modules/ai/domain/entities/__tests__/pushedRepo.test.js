'use strict';
const PushedRepo = require('../pushedRepo');
const UserId = require('../../value_objects/userId');
const RepoId = require('../../value_objects/repoId');
const RepoPushedEvent = require('../../events/repoPushedEvent');

describe('PushedRepo entity', () => {
  test('processPushedRepo returns response + event', async () => {
    const userId = new UserId('u1');
    const repoId = new RepoId('r1');
    const repoData = { url: 'x', branch: 'main' };
    const entity = new PushedRepo(userId, repoId);
    const port = { processPushedRepo: jest.fn().mockResolvedValue('OK') };
    const { response, event } = await entity.processPushedRepo(userId, repoId, repoData, port);
    expect(response).toBe('OK');
    expect(port.processPushedRepo).toHaveBeenCalledWith('u1','r1',repoData);
    expect(event).toBeInstanceOf(RepoPushedEvent);
    expect(event.repoData).toEqual(repoData);
  });
  test('invalid userId', async () => {
    const entity = new PushedRepo(new UserId('u1'), new RepoId('r1'));
    await expect(entity.processPushedRepo({}, new RepoId('r1'), {}, {processPushedRepo: jest.fn()})).rejects.toThrow('userId must be a UserId value object');
  });
  test('invalid repoId', async () => {
    const entity = new PushedRepo(new UserId('u1'), new RepoId('r1'));
    await expect(entity.processPushedRepo(new UserId('u1'), {}, {}, {processPushedRepo: jest.fn()})).rejects.toThrow('repoId must be a RepoId value object');
  });
});
