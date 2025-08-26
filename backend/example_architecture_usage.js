// Example usage of the updated generateArchitectureDocumentation method

const docsAdapter = new DocsLangchainAdapter({ aiProvider: 'openai' });

// Usage 1: Generate new documentation from scratch (original behavior)
await docsAdapter.generateArchitectureDocumentation('user123');

// Usage 2: Update existing ARCHITECTURE.md content (new functionality)
const fs = require('fs');
const path = require('path');

// Read existing ARCHITECTURE.md
const architectureFile = path.join(__dirname, '../../../../ARCHITECTURE.md');
let existingContent = null;

try {
  existingContent = await fs.promises.readFile(architectureFile, 'utf8');
} catch (err) {
  console.log('No existing ARCHITECTURE.md found, will generate new one');
}

// Call with existing content - will update instead of creating from scratch
await docsAdapter.generateArchitectureDocumentation('user123', existingContent);

// Usage 3: Force update with specific content
const customArchitectureContent = `
# Application Architecture

This is our existing architecture documentation that we want to update
based on the current codebase state...
`;

await docsAdapter.generateArchitectureDocumentation('user123', customArchitectureContent);
