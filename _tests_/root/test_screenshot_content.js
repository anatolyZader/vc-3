// Test with the EXACT content from the screenshot
function inlineShortFenced(md) {
  if (!md) return md;
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

// Test with the EXACT content from the screenshot
const testContent = `Inside the constructor of the ContextPipeline class:
- The
  \`\`\`
  server.js
  \`\`\`
  file simply requires the
  \`\`\`
  app.js
  \`\`\`
  module. Both files export the Express application instance.`;

console.log('=== ORIGINAL ===');
console.log(testContent);
console.log('\n=== PROCESSED ===');
const processed = inlineShortFenced(testContent);
console.log(processed);
console.log('\n=== VERIFICATION ===');
console.log('Contains server.js fence block?', testContent.includes('```\n  server.js\n  ```'));
console.log('After processing contains server.js fence block?', processed.includes('```\n  server.js\n  ```'));
console.log('Contains inline server.js?', processed.includes('`server.js`'));
console.log('Contains inline app.js?', processed.includes('`app.js`'));
