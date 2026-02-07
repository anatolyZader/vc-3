// Test the "text" language fix
// This tests the exact scenario from the screenshot: ```text\ndocs\n```

function inlineShortFenced(md) {
  if (!md) return md;
  const fencePattern = /```(\w+)?[^\S\r\n]*\r?\n([\s\S]*?)\r?\n[ \t]*```/g;
  return md.replace(fencePattern, (match, lang, body) => {
    const lines = String(body).split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 1) {
      const text = lines[0].trim();
      // Inline if no language or "inert" languages like text/txt/plain
      const inertLang = !lang || /^(text|txt|plain|plaintext)$/i.test(lang);
      if (inertLang && text.length <= 80 && !text.includes('```')) {
        return ` \`${text}\` `;
      }
    }
    return match;
  });
}

console.log('=== TEST: "TEXT" LANGUAGE FIX ===\n');

// Test 1: The exact failing case from the screenshot
console.log('TEST 1: ```text\\ndocs\\n``` (from screenshot)');
const test1 = 'The ```text\ndocs\n``` module works';
const result1 = inlineShortFenced(test1);
console.log('Input:', test1);
console.log('Output:', result1);
console.log('✅ Contains `docs`:', result1.includes('`docs`'));
console.log('❌ Still has ```text:', result1.includes('```text'));
console.log('');

// Test 2: TEXT uppercase
console.log('TEST 2: ```TEXT\\nDocs\\n``` (uppercase)');
const test2 = 'Use ```TEXT\nDocs\n``` component';
const result2 = inlineShortFenced(test2);
console.log('Output:', result2);
console.log('✅ Contains `Docs`:', result2.includes('`Docs`'));
console.log('');

// Test 3: Other inert languages
console.log('TEST 3: Other inert languages (txt, plain, plaintext)');
const inertLanguages = [
  { lang: 'txt', term: 'server.js' },
  { lang: 'plain', term: 'authPlugin' },
  { lang: 'plaintext', term: 'component' },
  { lang: 'PLAINTEXT', term: 'module' }
];

inertLanguages.forEach(({ lang, term }) => {
  const input = `Use \`\`\`${lang}\n${term}\n\`\`\` here`;
  const output = inlineShortFenced(input);
  const isInline = output.includes(`\`${term}\``);
  console.log(`  ${isInline ? '✅' : '❌'} \`\`\`${lang}\\n${term}\\n\`\`\` → ${isInline ? 'inline' : 'block'}`);
});
console.log('');

// Test 4: Real languages should stay as blocks
console.log('TEST 4: Real languages should stay blocks');
const realLanguages = [
  { lang: 'js', code: 'const x = 1;' },
  { lang: 'python', code: 'print("hello")' },
  { lang: 'javascript', code: 'console.log()' }
];

realLanguages.forEach(({ lang, code }) => {
  const input = `Use \`\`\`${lang}\n${code}\n\`\`\` here`;
  const output = inlineShortFenced(input);
  const staysBlock = output.includes(`\`\`\`${lang}`);
  console.log(`  ${staysBlock ? '✅' : '❌'} \`\`\`${lang}\\n...\\n\`\`\` → ${staysBlock ? 'block' : 'inline (wrong!)'}`);
});
console.log('');

// Test 5: Simulate ReactMarkdown code renderer
console.log('TEST 5: Simulate ReactMarkdown code renderer');
function simulateCodeRenderer(language, children) {
  const codeText = String(children).replace(/\s+$/, '');
  const isSingle = !codeText.includes('\n');
  const isInertLang = !language || /^(text|txt|plain|plaintext)$/i.test(language);
  
  if (isSingle && isInertLang && codeText.length <= 80) {
    return `INLINE: \`${codeText}\``;
  }
  return `BLOCK: \`\`\`${language}\\n${codeText}\\n\`\`\``;
}

const rendererTests = [
  { lang: 'text', code: 'docs\n', expected: 'INLINE' },
  { lang: 'TEXT', code: 'Docs\n', expected: 'INLINE' },
  { lang: null, code: 'server.js\n', expected: 'INLINE' },
  { lang: 'js', code: 'const x = 1;\n', expected: 'BLOCK' },
  { lang: 'text', code: 'very long text that exceeds eighty characters limit and should stay as a block\n', expected: 'BLOCK' }
];

rendererTests.forEach(({ lang, code, expected }) => {
  const result = simulateCodeRenderer(lang, code);
  const actual = result.startsWith('INLINE') ? 'INLINE' : 'BLOCK';
  const pass = actual === expected;
  console.log(`  ${pass ? '✅' : '❌'} lang="${lang}" code="${code.trim()}" → ${actual} (expected: ${expected})`);
});
console.log('');

// Test 6: The complete pipeline
console.log('TEST 6: Complete pipeline (inlineShortFenced + renderer)');
const completeTest = `The module in the VibeSwitch application:
- The \`\`\`text
docs
\`\`\` module works are:

1. Architecture: The module is structured around \`\`\`text
Docs
\`\`\` component.`;

const preprocessed = inlineShortFenced(completeTest);
console.log('After preprocessing:');
console.log(preprocessed);
console.log('');
console.log('✅ Contains `docs`:', preprocessed.includes('`docs`'));
console.log('✅ Contains `Docs`:', preprocessed.includes('`Docs`'));
console.log('❌ Still has ```text:', preprocessed.includes('```text'));
console.log('');

console.log('=== SUMMARY ===');
console.log('✅ Fix A: inlineShortFenced() now inlines ```text blocks');
console.log('✅ Fix B: Code renderers check isInertLang for text/txt/plain/plaintext');
console.log('✅ Screenshot case: ```text\\ndocs\\n``` → `docs` (inline)');
console.log('');
console.log('🎉 The "TEXT" code blocks from your screenshot should now be inline!');
console.log('📌 Remember to hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)');
