// Debug the inlineShortFenced function and the rendering issue

// The exact function from AnimatedMessageRenderer.jsx
function inlineShortFenced(md) {
  if (!md) return md;
  const singleLineFence = /(?:\n{1,2}|^)\s*```(?:\w+)?\s*\n([^\n\r]+)\n\s*```(?:\n{1,2}|$)/g;
  return md.replace(singleLineFence, (match, code) => {
    const text = String(code).trim();
    if (text.length <= 80 && !text.includes('```')) {
      return ` \`${text}\` `;
    }
    return match;
  });
}

// Test the copy button logic too
function testCopyButtonLogic(codeText) {
    const shouldShowCopyButton = codeText.length > 40 || 
        (codeText.includes(' ') && codeText.length > 15) || 
        (codeText.includes('\n')) ||
        (codeText.includes('()') && codeText.length > 10);
    
    return shouldShowCopyButton;
}

console.log('=== Debugging the rendering issue ===\n');

// Test sample content that might be similar to what's in the AI response
const testContent1 = `The method, which takes a 

\`\`\`
preprocessCodeDocument
\`\`\`

method, which takes a

\`\`\`
document
\`\`\`

object as input and performs the actual preprocessing of the code content.

3.
The

\`\`\`
extractFunctionNames
\`\`\`

method is used to extract function names from the code content, handling different syntax for JavaScript/TypeScript and Python.`;

console.log('Original content:');
console.log(testContent1);
console.log('\nAfter inlineShortFenced processing:');
console.log(inlineShortFenced(testContent1));

// Test another variation
const testContent2 = `method, which takes a \`\`\`
preprocessCodeDocument
\`\`\` method, which takes a \`\`\`
document
\`\`\` object as input and performs the actual preprocessing of the code content.`;

console.log('\n=== Test variation 2 ===');
console.log('Original content:');
console.log(testContent2);
console.log('\nAfter inlineShortFenced processing:');
console.log(inlineShortFenced(testContent2));

// Test individual terms for copy button logic
console.log('\n=== Copy button logic tests ===');
const terms = ['preprocessCodeDocument', 'document', 'extractFunctionNames'];
terms.forEach(term => {
    const result = testCopyButtonLogic(term);
    console.log(`"${term}" -> Copy button: ${result}`);
});

// Test the regex pattern directly
console.log('\n=== Regex pattern test ===');
const singleLineFence = /(?:\n{1,2}|^)\s*```(?:\w+)?\s*\n([^\n\r]+)\n\s*```(?:\n{1,2}|$)/g;
const testString = `\n\`\`\`\npreprocessCodeDocument\n\`\`\`\n`;
console.log('Test string:', JSON.stringify(testString));
console.log('Regex matches:', testString.match(singleLineFence));

// Test various patterns
const patterns = [
    '```\npreprocessCodeDocument\n```',
    '\n```\npreprocessCodeDocument\n```\n',
    '\n\n```\npreprocessCodeDocument\n```\n\n',
    'method ```\npreprocessCodeDocument\n``` method'
];

patterns.forEach((pattern, index) => {
    console.log(`\nPattern ${index + 1}: ${JSON.stringify(pattern)}`);
    console.log('After processing:', inlineShortFenced(pattern));
});