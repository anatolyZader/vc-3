'use strict';
const IAIPort = require('../IAIPort');

describe('IAIPort abstract contract', () => {
  test('cannot instantiate directly', () => {
    expect(() => new IAIPort()).toThrow('Cannot instantiate an abstract class.');
  });
  test('methods throw when not implemented', async () => {
    class Dummy extends IAIPort {}
    const d = new Dummy();
    await expect(d.processPushedRepo('u','r',{})).rejects.toThrow('Method not implemented.');
    await expect(d.respondToPrompt('u','c','p')).rejects.toThrow('Method not implemented.');
  });
});
