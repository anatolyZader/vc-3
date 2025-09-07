module.exports = {
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: false,
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['<rootDir>/_tests_/**/**.integration.test.js'],
  testPathIgnorePatterns: [
    '<rootDir>/business_modules/.*/__tests__/',
    '<rootDir>/aop_modules/.*/__tests__/'
  ],
};
