/**
 * Jest setup file to optimize test performance
 * This runs before all tests to set up global mocks and environment
 */

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Mock environment variables to avoid slow initialization
process.env.DISABLE_AI_SERVICES_IN_TESTS = 'true';
process.env.MOCK_EXTERNAL_SERVICES = 'true';

// Disable console logging in tests for cleaner output and better performance
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Mock console methods to be less verbose during tests
console.log = (...args) => {
  // Only log test-relevant messages
  const message = args.join(' ');
  if (message.includes('[TEST]') || process.env.JEST_VERBOSE === 'true') {
    originalConsoleLog(...args);
  }
};

console.warn = (...args) => {
  const message = args.join(' ');
  if (message.includes('[TEST]') || process.env.JEST_VERBOSE === 'true') {
    originalConsoleWarn(...args);
  }
};

// Keep error logging for debugging
console.error = originalConsoleError;

// Global test utilities
global.testUtils = {
  createMockFastify: () => ({
    diContainer: {
      hasRegistration: jest.fn().mockResolvedValue(true),
      resolve: jest.fn(),
      createScope: jest.fn().mockReturnValue({})
    },
    decorate: jest.fn(),
    log: {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn()
    },
    httpErrors: {
      internalServerError: (msg) => new Error(msg),
      badRequest: (msg) => new Error(msg),
      notFound: (msg) => new Error(msg)
    }
  }),
  
  createMockEventBus: () => ({
    emit: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn()
  })
};

// Mock heavy AI services by default
jest.mock('../business_modules/ai/infrastructure/ai/requestQueue', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ success: true }),
    startQueueProcessor: jest.fn(),
    stopQueueProcessor: jest.fn(),
    getQueueStatus: jest.fn().mockReturnValue({ length: 0 })
  }));
});

jest.mock('../business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pineconeLimiter', () => {
  return jest.fn().mockImplementation(() => ({
    schedule: jest.fn().mockResolvedValue({ success: true }),
    stop: jest.fn(),
    check: jest.fn().mockResolvedValue(0)
  }));
});

// Speed up timer-based operations in tests
jest.useFakeTimers();

beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
});