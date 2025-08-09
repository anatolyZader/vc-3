module.exports = {
    testEnvironment: 'node',
    verbose: true,
    collectCoverage: true,
    coverageDirectory: 'coverage',
    moduleFileExtensions: ['js', 'json'],
    testMatch: ['<rootDir>/_tests_/**/*.test.js'],
    testPathIgnorePatterns: [
        '<rootDir>/business_modules/.*/__tests__/',
    '<rootDir>/aop_modules/.*/__tests__/',
    '.*\\.integration\\.test\\.js$'
    ],
};
