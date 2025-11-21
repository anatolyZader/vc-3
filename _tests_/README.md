# Test Files Archive

This directory contains test and debug scripts that were moved from the root and backend directories to clean up the workspace.

## Structure

```
_tests_/
├── root/          # Test files from project root directory
├── backend/       # Test files from backend directory
└── business_modules/  # Jest test suites (organized by module)
```

## Contents

### `/root` - Root-level test scripts (70 files)
- Ad-hoc test scripts for various features
- Debug scripts for troubleshooting
- Integration tests
- Examples: `test_rag_pipeline_hybrid_search.js`, `debug_vector_pollution.js`

### `/backend` - Backend test scripts (44 files)
- Backend-specific test scripts
- AST splitter tests
- Chunk retrieval tests
- Processing pipeline tests
- Examples: `test_forced_method_splitting.js`, `debug_pinecone_index.js`

### `/business_modules` - Jest test suites
- Organized unit and integration tests
- Run with `npm test`
- Examples: `ai/`, `chat/`, `git/`, `docs/` module tests

## Running Tests

### Jest Test Suites (Recommended)
```bash
# Run all tests
npm test

# Run specific module tests
npm test -- ai
npm test -- chat

# Run with coverage
npm test -- --coverage
```

### Ad-hoc Test Scripts
```bash
# Run individual test scripts
node _tests_/root/test_rag_pipeline_hybrid_search.js
node _tests_/backend/test_forced_method_splitting.js
```

## Note

The test files in `/root` and `/backend` are historical/ad-hoc scripts used during development. For organized test suites, see the `/business_modules` directory which contains proper Jest test files integrated with the CI/CD pipeline.
