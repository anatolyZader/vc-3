'use strict';

const AIResponse = require('../entities/aiResponse');
const PushedRepo = require('../entities/pushedRepo');
const UserId = require('../value_objects/userId');
const RepoId = require('../value_objects/repoId');
const Prompt = require('../value_objects/prompt');
const AiResponseGeneratedEvent = require('../events/aiResponseGeneratedEvent');
const RepoPushedEvent = require('../events/repoPushedEvent');

describe('Domain Entities', () => {
  describe('AIResponse', () => {
    test('respondToPrompt returns response and event', async () => {
      const userId = new UserId('user1');
      const ai = new AIResponse(userId);
      const prompt = new Prompt('Hi');
      const mockPort = {
        respondToPrompt: jest.fn().mockResolvedValue('Answer')
      };

      const { response, event } = await ai.respondToPrompt(userId, 'conv1', prompt, mockPort);
      expect(response).toBe('Answer');
      expect(mockPort.respondToPrompt).toHaveBeenCalledWith('user1', 'conv1', 'Hi');
      expect(event).toBeInstanceOf(AiResponseGeneratedEvent);
      expect(event.response).toBe('Answer');
      expect(event.prompt).toBe('Hi');
    });

    test('respondToPrompt rejects invalid userId', async () => {
      const userId = new UserId('u');
      const ai = new AIResponse(userId);
      const prompt = new Prompt('Test');
      await expect(ai.respondToPrompt({}, 'c1', prompt, {respondToPrompt: jest.fn()})).rejects.toThrow('userId must be a UserId value object');
    });

    test('respondToPrompt rejects invalid prompt', async () => {
      const userId = new UserId('u');
      const ai = new AIResponse(userId);
      await expect(ai.respondToPrompt(userId, 'c1', {}, {respondToPrompt: jest.fn()})).rejects.toThrow('prompt must be a Prompt value object');
    });
  });

  describe('PushedRepo', () => {
    test('processPushedRepo returns response and event', async () => {
      const userId = new UserId('user1');
      const repoId = new RepoId('repo1');
      const entity = new PushedRepo(userId, repoId);
      const mockPort = {
        processPushedRepo: jest.fn().mockResolvedValue('Processed')
      };
      const repoData = { url: 'https://example.com', branch: 'main' };

      const { response, event } = await entity.processPushedRepo(userId, repoId, repoData, mockPort);
      expect(response).toBe('Processed');
      expect(mockPort.processPushedRepo).toHaveBeenCalledWith('user1', 'repo1', repoData);
      expect(event).toBeInstanceOf(RepoPushedEvent);
      expect(event.repoData).toEqual(repoData);
    });

    test('processPushedRepo rejects invalid userId', async () => {
      const userId = new UserId('user1');
      const repoId = new RepoId('repo1');
      const entity = new PushedRepo(userId, repoId);
      await expect(entity.processPushedRepo({}, repoId, {}, {processPushedRepo: jest.fn()})).rejects.toThrow('userId must be a UserId value object');
    });

    test('processPushedRepo rejects invalid repoId', async () => {
      const userId = new UserId('user1');
      const repoId = new RepoId('repo1');
      const entity = new PushedRepo(userId, repoId);
      await expect(entity.processPushedRepo(userId, {}, {}, {processPushedRepo: jest.fn()})).rejects.toThrow('repoId must be a RepoId value object');
    });
  });
});
