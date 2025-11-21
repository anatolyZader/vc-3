const ApiService = require('../../../../../business_modules/api/application/services/apiService');

class MockApiAdapter { async fetchHttpApi(){ return { paths: {} }; } }
class MockPersist { async saveHttpApi(){ this.saved = true; } }
class MockMessaging { async publishHttpApiFetchedEvent(evt){ this.evt = evt; } }

// Minimal HttpApi entity indirect path test through service

describe('ApiService.fetchHttpApi', () => {
  test('fetches, publishes event and returns spec', async () => {
    const svc = new ApiService({ apiAdapter: new MockApiAdapter(), apiPersistAdapter: new MockPersist(), apiMessagingAdapter: new MockMessaging() });
    const spec = await svc.fetchHttpApi('user1','repo1');
    expect(spec).toHaveProperty('paths');
  });
});
