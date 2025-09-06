'use strict';
const path = require('path');

describe('IAIService interface contract', () => {
  test('cannot instantiate directly and methods must be overridden', async () => {
    const IAIService = require(path.resolve(__dirname, '../../../../../business_modules/ai/application/services/interfaces/IAIService.js'));
    expect(() => new IAIService()).toThrow('Cannot instantiate an interface.');

    class Impl extends IAIService {}
    // bypass constructor guard for test
    Object.setPrototypeOf(Impl, function(){});
    const instance = Object.create(Impl.prototype);
    await expect(instance.respondToPrompt()).rejects.toThrow('Method not implemented.');
    await expect(instance.processPushedRepo()).rejects.toThrow('Method not implemented.');
  });
});
