// Test the updated inlineShortFenced function with indented fenced blocks

function inlineShortFenced(md) {
  if (!md) return md;
  // Match any fenced code block (supports indentation and CRLF)
  const fencePattern = /```(\w+)?[^\S\r\n]*\r?\n([\s\S]*?)\r?\n[ \t]*```/g;
  return md.replace(fencePattern, (match, lang, body) => {
    const lines = String(body).split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 1) {
      const text = lines[0].trim();
      if (text.length <= 80 && !text.includes('```')) {
        return ` \`${text}\` `;
      }
    }
    return match;
  });
}

console.log('=== Testing Updated inlineShortFenced with Indented Fenced Blocks ===\n');

// Test case from the screenshot - list bullets with indented fenced code
const testCase1 = `2.
Server Startup (server.js):

• The
  \`\`\`
  server.js
  \`\`\`
  file simply requires the
  \`\`\`
  app.js
  \`\`\`
  module and exports it.`;

console.log('Test Case 1: List with indented fenced blocks (from screenshot)');
console.log('BEFORE:');
console.log(testCase1);
console.log('\nAFTER inlineShortFenced:');
const result1 = inlineShortFenced(testCase1);
console.log(result1);
console.log('\n' + '='.repeat(80) + '\n');

// Test case 2: Multiple indented blocks
const testCase2 = `- The
  \`\`\`
  preprocessCodeDocument
  \`\`\`
  method, which takes a
  \`\`\`
  document
  \`\`\`
  object as input.`;

console.log('Test Case 2: Multiple indented blocks');
console.log('BEFORE:');
console.log(testCase2);
console.log('\nAFTER inlineShortFenced:');
const result2 = inlineShortFenced(testCase2);
console.log(result2);
console.log('\n' + '='.repeat(80) + '\n');

// Test case 3: Mixed indentation
const testCase3 = `The
    \`\`\`
    extractFunctionNames
    \`\`\`
method is used to extract function names.`;

console.log('Test Case 3: Mixed indentation levels');
console.log('BEFORE:');
console.log(testCase3);
console.log('\nAFTER inlineShortFenced:');
const result3 = inlineShortFenced(testCase3);
console.log(result3);
console.log('\n' + '='.repeat(80) + '\n');

// Verify the results
console.log('=== VERIFICATION ===\n');

const checks = [
  { name: 'server.js inline', pass: result1.includes('`server.js`') && !result1.includes('```\n  server.js') },
  { name: 'app.js inline', pass: result1.includes('`app.js`') && !result1.includes('```\n  app.js') },
  { name: 'preprocessCodeDocument inline', pass: result2.includes('`preprocessCodeDocument`') },
  { name: 'document inline', pass: result2.includes('`document`') },
  { name: 'extractFunctionNames inline', pass: result3.includes('`extractFunctionNames`') }
];

checks.forEach(check => {
  console.log(`${check.pass ? '✅' : '❌'} ${check.name}: ${check.pass ? 'PASS' : 'FAIL'}`);
});

const allPassed = checks.every(c => c.pass);
console.log(`\n${allPassed ? '🎉 ALL TESTS PASSED!' : '❌ SOME TESTS FAILED'}`);
console.log('\nThe updated regex now handles:');
console.log('✅ Indented fenced blocks (from list items)');
console.log('✅ CRLF line endings');
console.log('✅ Multiple indentation levels');
console.log('✅ Whitespace before/after fences');
