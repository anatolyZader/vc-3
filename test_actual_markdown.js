// Test what the actual AI response looks like
const testResponse = `The module in the EventStorm.me application appears to be responsible for managing the core functionality of a docs-based app
cation. The key points about how the

\`\`\`text
docs
\`\`\`

module works are:

1.
Architecture: The module is structured around two main entities:

• \`\`\`text
Docs
\`\`\` : Represents the overall docs, containing a collection of`;

console.log('=== ACTUAL AI RESPONSE ===');
console.log(testResponse);
console.log('\n=== CHECKING FOR TEXT BLOCKS ===');
console.log('Contains ```text:', testResponse.includes('```text'));
console.log('Count of ```text blocks:', (testResponse.match(/```text/g) || []).length);

// Show what inlineShortFenced would do
function inlineShortFenced(md) {
  if (!md) return md;
  const fencePattern = /```(\w+)?[^\S\r\n]*\r?\n([\s\S]*?)\r?\n[ \t]*```/g;
  return md.replace(fencePattern, (match, lang, body) => {
    const lines = String(body).split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 1) {
      const text = lines[0].trim();
      const inertLang = !lang || /^(text|txt|plain|plaintext)$/i.test(lang);
      if (inertLang && text.length <= 80 && !text.includes('```')) {
        return ` \`${text}\` `;
      }
    }
    return match;
  });
}

console.log('\n=== AFTER inlineShortFenced() ===');
const processed = inlineShortFenced(testResponse);
console.log(processed);
console.log('\n=== VERIFICATION ===');
console.log('Still has ```text:', processed.includes('```text'));
console.log('Has `docs`:', processed.includes('`docs`'));
console.log('Has `Docs`:', processed.includes('`Docs`'));
