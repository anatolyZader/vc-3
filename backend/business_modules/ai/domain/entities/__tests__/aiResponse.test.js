'use strict';
const AIResponse = require('../aiResponse');
const UserId = require('../../value_objects/userId');
const Prompt = require('../../value_objects/prompt');
const AiResponseGeneratedEvent = require('../../events/aiResponseGeneratedEvent');

describe('AIResponse entity', () => {
  test('respondToPrompt returns response + event', async () => {
    const userId = new UserId('u1');
    const entity = new AIResponse(userId);
    const prompt = new Prompt('Hi');
    const port = { respondToPrompt: jest.fn().mockResolvedValue('Answer') };
    const { response, event } = await entity.respondToPrompt(userId, 'conv1', prompt, port);
    expect(response).toBe('Answer');
    expect(port.respondToPrompt).toHaveBeenCalledWith('u1','conv1','Hi');
    expect(event).toBeInstanceOf(AiResponseGeneratedEvent);
    expect(event.prompt).toBe('Hi');
  });
  test('invalid userId', async () => {
    const entity = new AIResponse(new UserId('u1'));
    const prompt = new Prompt('Hi');
    await expect(entity.respondToPrompt({}, 'c1', prompt, {respondToPrompt: jest.fn()})).rejects.toThrow('userId must be a UserId value object');
  });
  test('invalid prompt', async () => {
    const entity = new AIResponse(new UserId('u1'));
    await expect(entity.respondToPrompt(new UserId('u1'), 'c1', {}, {respondToPrompt: jest.fn()})).rejects.toThrow('prompt must be a Prompt value object');
  });
});
