module.exports = {
    testEnvironment: 'node',
    verbose: true,
    collectCoverage: true,
    coverageDirectory: 'coverage',
    moduleFileExtensions: ['js', 'json'],
    testMatch: ['<rootDir>/_tests_/**/*.test.js'],
    testPathIgnorePatterns: [
        '<rootDir>/business_modules/.*/__tests__/',
        '<rootDir>/aop_modules/.*/__tests__/'
    ],
    // Performance optimizations for fast testing
    maxWorkers: '50%',
    testTimeout: 10000,
    // Setup files to run before tests - temporarily disabled to fix path issues
    // setupFilesAfterEnv: ['<rootDir>/_tests_/setup/jest.setup.js'],
};
