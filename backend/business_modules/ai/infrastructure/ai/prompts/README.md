# AI Prompt Management System

This directory contains a comprehensive prompt management system for the AI module, providing centralized, maintainable, and intelligent prompt selection.

## 📁 File Structure

```
prompts/
├── index.js              # Main exports for easy importing
├── systemPrompts.js       # Core system prompts and selection logic
├── promptConfig.js        # Configuration settings and keywords
├── promptTester.js        # Testing utilities for development
└── README.md             # This documentation
```

## 🚀 Quick Start

```javascript
// Import the prompt system
const { PromptSelector, SystemPrompts } = require('./prompts');

// Auto-select appropriate prompt
const prompt = PromptSelector.selectPrompt({
  hasRagContext: true,
  conversationCount: 3,
  question: "How do I fix this API endpoint?",
  contextSources: { apiSpec: true, code: true }
});

// Use specific prompt
const ragPrompt = SystemPrompts.ragSystem(5);
const generalPrompt = SystemPrompts.general(0);
```

## 🎯 Available Prompt Types

### 1. **RAG System** (`ragSystem`)
- **Use Case**: Questions about the user's application with available context
- **Features**: Balances application-specific and general knowledge
- **Context**: API specs, documentation, code repository

### 2. **Standard** (`standard`)
- **Use Case**: Software development questions without specific context
- **Features**: General software development assistance
- **Context**: No specific application context

### 3. **Code Analysis** (`codeAnalysis`)
- **Use Case**: Code review, debugging, optimization questions
- **Features**: Expert-level code analysis and suggestions
- **Context**: Code-focused assistance

### 4. **API Specialist** (`apiSpecialist`)
- **Use Case**: API design, endpoint, and specification questions
- **Features**: REST API best practices and patterns
- **Context**: API-focused assistance

### 5. **General** (`general`)
- **Use Case**: Non-technical questions, general knowledge
- **Features**: Broad knowledge across many topics
- **Context**: General knowledge base

### 6. **Fallback** (`fallback`)
- **Use Case**: Error situations or when other prompts fail
- **Features**: Basic assistance with limited context
- **Context**: Minimal context available

## 🤖 Auto-Selection Logic

The system intelligently selects prompts based on:

1. **Context Analysis**: Available RAG context (API specs, docs, code)
2. **Keyword Detection**: Question content analysis
3. **Conversation History**: Number of previous exchanges
4. **Source Composition**: Types of available information

### Keyword Categories

- **Application**: api, endpoint, database, function, method, class, component...
- **API**: rest, endpoint, http, swagger, openapi, json, response...
- **Code**: function, method, class, debug, error, syntax, optimize...
- **General**: what is, how does, explain, tell me about, history of...

## 🧪 Testing and Development

### Run Comprehensive Tests
```javascript
const { PromptTester } = require('./prompts');

// Run all test cases
const results = PromptTester.runTests();

// Test specific question
const result = PromptTester.testPromptSelection("Tell me about the history of Earth");
```

### Interactive Testing
```javascript
// Test with different contexts
PromptTester.interactiveTest("How do I optimize this function?", true, 2);
```

### A/B Testing
```javascript
// Compare two different configurations
PromptTester.comparePrompts(
  "What's wrong with my API?",
  { hasRagContext: true, mode: 'auto' },
  { hasRagContext: false, mode: 'api' }
);
```

## ⚙️ Configuration

### Modify Keywords
Edit `promptConfig.js` to adjust keyword detection:

```javascript
keywords: {
  application: ['api', 'endpoint', 'database', ...],
  api: ['rest', 'endpoint', 'http', ...],
  // Add your custom keywords
}
```

### Adjust Thresholds
```javascript
thresholds: {
  minContextForRag: 1,        // Minimum context sources for RAG
  minKeywordMatches: 2,       // Minimum keywords for category detection
  confidenceThreshold: 0.6    // Minimum confidence for auto-selection
}
```

### Enable Logging
```javascript
logging: {
  logPromptSelection: true,     // Log selected prompts
  logKeywordAnalysis: false,    // Log keyword matching details
  logContextAnalysis: true      // Log context source analysis
}
```

## 🔧 Manual Override

Force specific prompt types for testing:

```javascript
const prompt = PromptSelector.selectPrompt({
  question: "Any question",
  mode: 'general'  // Override: 'rag', 'standard', 'code', 'api', 'general', 'fallback'
});
```

## 📈 Benefits

1. **Maintainability**: Central prompt management
2. **Flexibility**: Easy to modify and test prompts
3. **Intelligence**: Context-aware prompt selection
4. **Consistency**: Standardized prompts across the system
5. **Testing**: Built-in testing utilities
6. **Performance**: Optimized prompts for different use cases
7. **Version Control**: Track prompt changes over time

## 🔮 Future Enhancements

- **Semantic Analysis**: Advanced question understanding
- **Dynamic Adjustment**: Prompts that adapt during conversation
- **Performance Metrics**: Track prompt effectiveness
- **Custom Prompts**: User-defined prompt templates
- **Multi-language**: Support for different languages

## Example Usage in Main Code

```javascript
// In aiLangchainAdapter.js
const { PromptSelector } = require('./prompts');

// Replace hardcoded prompts with intelligent selection
const systemPrompt = PromptSelector.selectPrompt({
  hasRagContext: similarDocuments.length > 0,
  conversationCount: conversationHistory.length,
  question: prompt,
  contextSources: {
    apiSpec: sourceAnalysis.apiSpec > 0,
    rootDocumentation: sourceAnalysis.rootDocumentation > 0,
    moduleDocumentation: sourceAnalysis.moduleDocumentation > 0,
    code: sourceAnalysis.githubRepo > 0
  },
  mode: 'auto'
});
```

This system ensures your AI provides the most appropriate responses based on context and question type, while maintaining clean, manageable code.
