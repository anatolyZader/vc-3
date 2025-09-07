module.exports = {
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: false,
  moduleFileExtensions: ['js', 'json'],
  // While focusing on chat module, only run chat integration tests
  testMatch: [
    '<rootDir>/_tests_/business_modules/chat/integration/**/**.integration.test.js'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/business_modules/.*/__tests__/',
    '<rootDir>/aop_modules/.*/__tests__/'
  ],
};
