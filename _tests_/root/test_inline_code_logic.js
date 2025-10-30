// Test the new inline code copy button logic
function testCopyButtonLogic(codeText) {
    const shouldShowCopyButton = codeText.length > 40 || 
        (codeText.includes(' ') && codeText.length > 15) || 
        (codeText.includes('\n')) ||
        (codeText.includes('()') && codeText.length > 10);
    
    return shouldShowCopyButton;
}

console.log('=== Testing Inline Code Copy Button Logic Fix ===\n');

// Test cases that should NOT get copy buttons (stay inline)
const shouldStayInline = [
    'contextPipeline.js',
    'ContextPipeline', 
    'app.js',
    'index.html',
    'config.json',
    'package.json',
    'npm install',
    'git status',
    'getData()',
    'test.ts',
    'main.py'
];

console.log('✓ These should STAY INLINE (no copy button):');
shouldStayInline.forEach(code => {
    const result = testCopyButtonLogic(code);
    const status = result ? '❌ FAIL' : '✅ PASS';
    console.log(`  ${status} "${code}" -> Copy button: ${result}`);
});

console.log('\n');

// Test cases that should GET copy buttons
const shouldGetCopyButton = [
    'const result = await fetchUserDataFromDatabase(userId, options)',
    'npm install --save-dev @types/node typescript eslint',
    'longFunctionName()',
    'calculateTotal(items, tax)',
    'very.long.filename.with.many.dots.and.extensions.js',
    'function test() {\n  return true;\n}',
    'someFunction() { return value; }',
    'this is a long piece of code that should get copy button',
    'multipleWords() withSpaces'
];

console.log('✓ These should GET COPY BUTTONS:');
shouldGetCopyButton.forEach(code => {
    const result = testCopyButtonLogic(code);
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status} "${code.replace(/\n/g, '\\n')}" -> Copy button: ${result}`);
});

console.log('\n=== Summary ===');
console.log('The new logic should fix the text flow issue by being more selective about when to show copy buttons.');
console.log('Filenames, class names, and short code snippets will stay inline.');
console.log('Only longer, more complex code will get copy buttons.');