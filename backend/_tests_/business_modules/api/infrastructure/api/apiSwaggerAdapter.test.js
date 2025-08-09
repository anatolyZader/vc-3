const ApiSwaggerAdapter = require('../../../../../business_modules/api/infrastructure/api/apiSwaggerAdapter');

describe('ApiSwaggerAdapter', () => {
  test('fetchHttpApi returns spec', async () => {
    const adapter = new ApiSwaggerAdapter();
    const spec = await adapter.fetchHttpApi('u1','r1');
    expect(spec).toHaveProperty('openapi');
  });
});
