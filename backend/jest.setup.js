// Test setup file to optimize performance and add mocks
// This runs before all tests

// Set test environment
process.env.NODE_ENV = 'test';

// Mock heavy services to speed up tests
jest.mock('./business_modules/ai/infrastructure/ai/requestQueue', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue('mocked-request'),
    startQueueProcessor: jest.fn(),
    stopQueueProcessor: jest.fn()
  }));
});

// Mock PineconeLimiter to avoid rate limiting setup
jest.mock('./business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pineconeLimiter', () => {
  return jest.fn().mockImplementation(() => ({
    schedule: jest.fn().mockResolvedValue('mocked-result')
  }));
});

// Disable console logs during tests for cleaner output (optional)
if (process.env.SILENCE_TESTS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}

// Global test timeout
jest.setTimeout(30000);