// Test the updated inlineShortFenced function

// The updated function
function inlineShortFenced(md) {
  if (!md) return md;
  
  // First handle standalone fenced blocks (on their own lines)
  const singleLineFence = /(?:\n{1,2}|^)\s*```(?:\w+)?\s*\n([^\n\r]+)\n\s*```(?:\n{1,2}|$)/g;
  let result = md.replace(singleLineFence, (match, code) => {
    const text = String(code).trim();
    if (text.length <= 80 && !text.includes('```')) {
      return ` \`${text}\` `;
    }
    return match;
  });
  
  // Then handle inline fenced blocks (mixed with text)
  const inlineFence = /```(?:\w+)?\s*\n([^\n\r]+)\n\s*```/g;
  result = result.replace(inlineFence, (match, code) => {
    const text = String(code).trim();
    if (text.length <= 80 && !text.includes('```')) {
      return `\`${text}\``;
    }
    return match;
  });
  
  return result;
}

console.log('=== Testing Updated inlineShortFenced Function ===\n');

// Test the problematic cases that weren't working before
const testCases = [
    {
        name: 'Standalone fenced blocks',
        content: `The method, which takes a 

\`\`\`
preprocessCodeDocument
\`\`\`

method, which takes a

\`\`\`
document
\`\`\`

object as input.`
    },
    {
        name: 'Inline fenced blocks',
        content: `method, which takes a \`\`\`
preprocessCodeDocument
\`\`\` method, which takes a \`\`\`
document
\`\`\` object as input.`
    },
    {
        name: 'Mixed content like from screenshot',
        content: `method, which takes a

\`\`\`
TEXT
\`\`\`

\`\`\`
preprocessCodeDocument
\`\`\`

method, which takes a

\`\`\`
TEXT  
\`\`\`

\`\`\`
document
\`\`\`

object as input and performs the actual preprocessing of the code content.

3.
The

\`\`\`
TEXT
\`\`\`

\`\`\`
extractFunctionNames
\`\`\`

method is used to extract function names from the code content.`
    },
    {
        name: 'Real-world example similar to screenshot',
        content: `The \`\`\`
preprocessCodeDocument
\`\`\` method, which takes a \`\`\`
document
\`\`\` object as input and performs the actual preprocessing of the code content.

3.
The \`\`\`
extractFunctionNames
\`\`\` method is used to extract function names from the code content, handling different syntax for JavaScript/TypeScript and Python.`
    }
];

testCases.forEach((testCase, index) => {
    console.log(`=== ${testCase.name} ===`);
    console.log('Original:');
    console.log(testCase.content);
    console.log('\nAfter processing:');
    console.log(inlineShortFenced(testCase.content));
    console.log('\n');
});

// Test edge cases
console.log('=== Edge Cases ===');
const edgeCases = [
    'Simple `inline` code should stay unchanged',
    'Multiple \`\`\`\nterms\n\`\`\` in \`\`\`\none\n\`\`\` sentence',
    'Very long fenced block \`\`\`\nThis is a very long piece of code that should probably stay as a code block because it exceeds the 80 character limit\n\`\`\`',
    'Empty \`\`\`\n\`\`\` blocks should be handled gracefully'
];

edgeCases.forEach((testCase, index) => {
    console.log(`Edge case ${index + 1}:`);
    console.log('Original:', testCase);
    console.log('Processed:', inlineShortFenced(testCase));
    console.log('');
});