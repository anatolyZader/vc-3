// Test setup file to optimize performance and add mocks
// This runs before all tests

// Set test environment
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(30000);