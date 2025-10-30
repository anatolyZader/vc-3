// test_detailed_debug.js
// Detailed debug for AST parsing issue

const path = require('path');
const fs = require('fs');
const { parse } = require('@babel/parser');

async function detailedDebugAST() {
  console.log('========================================');
  console.log('🔍 DETAILED DEBUG: AST PARSING');
  console.log('========================================');

  // Read the aiLangchainAdapter.js file
  const filePath = path.join(__dirname, 'business_modules/ai/infrastructure/ai/aiLangchainAdapter.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  console.log(`\n📄 File: ${content.length} characters`);

  // Test basic Babel parsing
  console.log('\n🔧 Testing Babel parsing...');
  try {
    const plugins = ['jsx', 'typescript', 'decorators-legacy', 'classProperties', 'importAssertions'];
    
    const ast = parse(content, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins
    });

    console.log('✅ Babel parsing successful');
    console.log(`📊 AST type: ${ast.type}`);
    console.log(`📊 Program body length: ${ast.program?.body ? ast.program.body.length : 0}`);
    
    if (ast.program?.body && ast.program.body.length > 0) {
      console.log('\n📊 Top-level statements:');
      ast.program.body.forEach((node, index) => {
        console.log(`   ${index + 1}: ${node.type} (line ${node.loc?.start?.line || '?'})`);
        if (node.type === 'ClassDeclaration' && node.id) {
          console.log(`      → Class: ${node.id.name}`);
        }
        if (node.type === 'VariableDeclaration') {
          console.log(`      → Variables: ${node.declarations.map(d => d.id?.name || '?').join(', ')}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Babel parsing failed:', error.message);
    console.error('Stack:', error.stack);
    return;
  }

  // Test the specific pattern that might be causing issues
  console.log('\n🔍 Looking for specific patterns...');
  
  const hasClass = content.includes('class ');
  const hasModuleExports = content.includes('module.exports');
  const hasAsyncFunction = content.includes('async ');
  const hasConstructor = content.includes('constructor(');
  
  console.log(`📊 Has class: ${hasClass}`);
  console.log(`📊 Has module.exports: ${hasModuleExports}`);
  console.log(`📊 Has async functions: ${hasAsyncFunction}`);
  console.log(`📊 Has constructor: ${hasConstructor}`);

  console.log('\n🏁 Detailed debug completed');
}

// Run the detailed debug
detailedDebugAST().catch(console.error);