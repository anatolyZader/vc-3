# Docs CLI Documentation

The Docs CLI provides command-line access to the docs documentation generation functionality, allowing you to manually trigger the comprehensive documentation generation that normally happens through the web API.

## Overview

The CLI tool generates two types of documentation:

1. **Module Documentation** - Individual `.md` files for each business module (ai.md, chat.md, git.md, etc.)
2. **Root Documentation** - `ROOT_DOCUMENTATION.md` covering backend plugins and core files  

**Note**: `ARCHITECTURE.md` is manually maintained and automatically indexed for RAG queries.

## Usage

### From Backend Root Directory

```bash
# Generate documentation with default settings
npm run docs:generate

# Generate documentation with specific user ID
npm run docs:generate -- --user-id admin-123

# Show help
npm run docs:help

# Or run directly
node docs-cli.js
node docs-cli.js --user-id your-user-id
```

### From Docs Module Directory

```bash
cd backend/business_modules/docs/input
node docsCli.js [options]
```

## Command Line Options

- `--user-id <userId>` - Specify a user ID for the operation (default: 'cli-user')
- `--help, -h` - Show help information

## Environment Requirements

The following environment variables must be set:

### Required
- `PINECONE_API_KEY` - For vector storage and similarity search

### AI Provider (at least one required)
- `OPENAI_API_KEY` - For OpenAI GPT models
- `ANTHROPIC_API_KEY` - For Anthropic Claude models  
- `GOOGLE_API_KEY` - For Google AI models

## Examples

```bash
# Basic usage
npm run docs:generate

# With specific user ID
npm run docs:generate -- --user-id project-admin

# Direct execution with user ID
node docs-cli.js --user-id development-team

# Show help
npm run docs:help
```

## Output

The CLI will generate the following files:

### Module Documentation
- `backend/business_modules/ai/ai.md`
- `backend/business_modules/api/api.md`  
- `backend/business_modules/chat/chat.md`
- `backend/business_modules/git/git.md`
- `backend/business_modules/docs/docs.md`

### Consolidated Documentation
- `backend/ROOT_DOCUMENTATION.md` - Backend plugins and core files

**Note**: `backend/ARCHITECTURE.md` is manually maintained and automatically indexed for RAG queries.

## Features

### Smart Environment Detection
- Automatically detects available AI providers
- Validates required environment variables before execution
- Provides clear error messages for missing configuration

### Progress Tracking
- Real-time status updates during generation
- Performance timing information
- Memory usage monitoring

### Error Handling
- Graceful handling of interruptions (Ctrl+C)
- Comprehensive error reporting
- Proper exit codes for scripting

### Multiple Access Methods
- Direct CLI execution from module directory
- Convenience script from backend root
- NPM script integration

## File Structure

```
backend/
├── docs-cli.js                    # Convenience script (backend root)
├── package.json                   # NPM scripts added
└── business_modules/docs/input/
    ├── docsCli.js                 # Main CLI implementation
    ├── docsRouter.js              # Web API routes
    └── docsPubsubListener.js      # Event listeners
```

## Integration with Existing System

The CLI uses the same `DocsLangchainAdapter` that powers the web API, ensuring consistent behavior and output between manual CLI execution and automated web-triggered generation.

## Performance Notes

- Generation typically takes 30-120 seconds depending on codebase size
- Memory usage is monitored and reported
- Automatic garbage collection helps manage memory
- Progress updates keep you informed during long operations

## Troubleshooting

### Common Issues

1. **Missing API Keys**
   ```
   ❌ Missing required environment variables:
      - PINECONE_API_KEY
   ```
   Solution: Set the required environment variables

2. **No AI Provider**
   ```
   ❌ No AI provider API key found. Please set one of:
      - OPENAI_API_KEY
      - ANTHROPIC_API_KEY  
      - GOOGLE_API_KEY
   ```
   Solution: Set at least one AI provider API key

3. **Process Interrupted**
   ```
   ⚠️  Process interrupted by user (Ctrl+C)
   🔄 Cleaning up...
   ```
   This is normal - the CLI handles interruptions gracefully

### Debug Information

The CLI provides verbose logging including:
- Environment validation results
- AI provider selection
- Generation progress
- Memory usage statistics
- Performance timing

This information helps diagnose issues and optimize performance.
