# RAG Pipeline Logging Configuration

## Overview

The RAG pipeline now includes configurable logging to help manage verbose output and focus on errors when needed. This allows you to enable detailed logs for debugging while keeping production logs clean.

## Environment Variables

Control logging levels using these environment variables:

```bash
# Enable verbose processing logs (chunking, splitting, analysis details)
export RAG_VERBOSE_LOGS=true

# Enable debug logs (internal state, detailed operations)
export RAG_DEBUG_LOGS=true

# Enable processing step logs (high-level operations)
export RAG_PROCESSING_LOGS=true
```

## Usage Examples

### Production (Minimal Logs)
```bash
# Default - only errors, warnings, and critical info
npm start
```

### Development (All Logs)
```bash
# Enable all logging for full debugging
RAG_VERBOSE_LOGS=true RAG_DEBUG_LOGS=true RAG_PROCESSING_LOGS=true npm start
```

### Debugging Specific Issues
```bash
# Only processing steps (no verbose details)
RAG_PROCESSING_LOGS=true npm start

# Only verbose chunking/splitting details
RAG_VERBOSE_LOGS=true npm start
```

## Log Types

### Always Enabled
- **Errors** (`console.error`) - Critical failures
- **Warnings** (`console.warn`) - Important issues
- **Info** (`console.log`) - Essential status updates

### Configurable
- **Verbose** (`logConfig.logVerbose`) - Detailed processing info
- **Debug** (`logConfig.logDebug`) - Internal state details  
- **Processing** (`logConfig.logProcessing`) - High-level operations

## Implementation in Code

```javascript
const logConfig = require('./logConfig');

// Always logged (production-safe)
logConfig.logError('❌ Critical error occurred');
logConfig.logWarn('⚠️ Important warning');
logConfig.logInfo('✅ Operation completed successfully');

// Configurable (can be disabled)
logConfig.logVerbose('🔍 Detailed analysis: chunk size = 1234 tokens');
logConfig.logDebug('🔧 Internal state: worker pool size = 4');
logConfig.logProcessing('📊 Processing repository with 150 files');
```

## Benefits

1. **Clean Production Logs** - Only errors and essential info by default
2. **Debugging Flexibility** - Enable detailed logs when needed
3. **Performance** - Disabled logs have minimal overhead
4. **Maintainability** - Centralized configuration vs scattered console.log statements

## Migration Guide

Replace verbose console.log statements with configurable logging:

```javascript
// Before
console.log(`🔍 AST ANALYSIS: Found ${imports.length} imports`);

// After  
logConfig.logVerbose(`🔍 AST ANALYSIS: Found ${imports.length} imports`);
```