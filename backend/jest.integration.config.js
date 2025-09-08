module.exports = {
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: false,
  moduleFileExtensions: ['js', 'json'],
  // More stable CI-style execution for integration tests
  maxWorkers: 1,
  testTimeout: 60000,
  detectOpenHandles: true,
  // While focusing on chat module, only run chat integration tests
  testMatch: [
  '<rootDir>/_tests_/business_modules/chat/integration/**/**.integration.test.js',
  '<rootDir>/_tests_/business_modules/docs/integration/**/**.integration.test.js',
  '<rootDir>/_tests_/business_modules/git/integration/**/**.integration.test.js'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/business_modules/.*/__tests__/',
    '<rootDir>/aop_modules/.*/__tests__/'
  ],
};
