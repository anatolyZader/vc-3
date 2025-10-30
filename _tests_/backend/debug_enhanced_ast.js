// Debug Enhanced AST Splitter Step by Step
'use strict';

const fs = require('fs');
const path = require('path');
const ASTCodeSplitter = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter');

async function debugEnhancedASTSplitter() {
  console.log('========================================');
  console.log('🔍 DEBUG ENHANCED AST SPLITTER');
  console.log('========================================\n');

  try {
    // Read a small portion of app.js for testing
    const appJsPath = path.join(__dirname, 'app.js');
    const fullCode = fs.readFileSync(appJsPath, 'utf8');
    
    // Use the full code for testing (the truncation was causing syntax errors)
    const testCode = fullCode;
    
    console.log(`📄 Full app.js: ${testCode.length} characters\n`);

    // Create enhanced AST splitter
    const astSplitter = new ASTCodeSplitter({
      maxTokens: 500,
      minTokens: 30,
      overlapTokens: 50,
      fastifyRules: {
        keepCompleteRegistrations: true,
        keepCompleteRoutes: true,
        splitMethods: true,
        recognizePatterns: true
      },
      semanticCoherence: true,
      mergeSmallChunks: false
    });

    console.log('🔧 Parsing AST...');
    
    // Test AST parsing directly
    const ast = astSplitter.parseCode(testCode, '.js');
    console.log('✅ AST parsed successfully');
    
    console.log('🔍 Extracting semantic units...');
    
    // Test semantic unit extraction
    const semanticUnits = astSplitter.extractSemanticUnits(ast, testCode, { source: 'app.js' });
    console.log(`📦 Found ${semanticUnits.length} semantic units\n`);
    
    if (semanticUnits.length > 0) {
      console.log('📋 SEMANTIC UNITS DETAILS:');
      semanticUnits.forEach((unit, index) => {
        console.log(`   ${index + 1}: ${unit.type} | ${unit.semanticType || 'unknown'} | ${unit.tokenCount || 'unknown'} tokens`);
        if (unit.callType) console.log(`      Call Type: ${unit.callType}`);
        if (unit.shouldKeepTogether) console.log(`      Keep Together: ${unit.shouldKeepTogether}`);
        console.log(`      Lines: ${unit.startLine}-${unit.endLine}`);
        console.log(`      Content preview: ${unit.content.substring(0, 100)}...`);
        console.log('');
      });
    } else {
      console.log('❌ No semantic units found!');
      console.log('🔍 Let\'s check what the AST contains...');
      
      // Manual traverse to see what nodes we find
      const { parse } = require('@babel/parser');
      const traverse = require('@babel/traverse').default;
      
      const testAst = parse(testCode, {
        sourceType: 'module',
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties', 'importAssertions']
      });
      
      console.log('🔍 Manual AST traversal:');
      traverse(testAst, {
        enter(path) {
          if (path.node.type === 'CallExpression' || 
              path.node.type === 'FunctionDeclaration' ||
              path.node.type === 'VariableDeclaration') {
            console.log(`   Found: ${path.node.type} at line ${path.node.loc?.start.line || 'unknown'}`);
          }
        }
      });
    }

  } catch (error) {
    console.error('❌ Error during debug:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Run the debug test
if (require.main === module) {
  debugEnhancedASTSplitter()
    .then(() => {
      console.log('\n🏁 Debug completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Debug failed:', error.message);
      process.exit(1);  
    });
}

module.exports = debugEnhancedASTSplitter;