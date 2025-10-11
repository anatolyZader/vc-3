// Debug isTopLevel Logic
'use strict';

const fs = require('fs');
const path = require('path');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

function debugIsTopLevel() {
  console.log('========================================');
  console.log('🔍 DEBUG isTopLevel LOGIC');
  console.log('========================================\n');

  try {
    const appJsPath = path.join(__dirname, 'app.js');
    const code = fs.readFileSync(appJsPath, 'utf8');
    
    const ast = parse(code, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties', 'importAssertions']
    });

    console.log('🔍 Analyzing CallExpression parent structures:\n');

    traverse(ast, {
      CallExpression: (path) => {
        if (path.node.loc && path.node.loc.start.line >= 28 && path.node.loc.start.line <= 40) {
          console.log(`📍 Line ${path.node.loc.start.line}:`);
          console.log(`   CallExpression: ${path.node.callee?.property?.name || 'unknown'}`);
          console.log(`   Parent: ${path.parent?.type || 'none'}`);
          console.log(`   GrandParent: ${path.parent?.parent?.type || 'none'}`);
          console.log(`   GreatGrandParent: ${path.parent?.parent?.parent?.type || 'none'}`);
          
          // Check if it's a fastify call
          if (path.node.callee?.type === 'MemberExpression' &&
              path.node.callee.object?.name === 'fastify') {
            console.log(`   🚀 FASTIFY CALL DETECTED!`);
          }
          
          console.log('');
        }
      }
    });

    console.log('🔍 Looking for module.exports structure:\n');
    
    traverse(ast, {
      AssignmentExpression: (path) => {
        const left = path.node.left;
        if (left.type === 'MemberExpression' &&
            left.object && left.object.name === 'module' &&
            left.property && left.property.name === 'exports') {
          console.log('📦 Found module.exports assignment!');
          console.log(`   Right side type: ${path.node.right?.type}`);
          console.log(`   Function async: ${path.node.right?.async || false}`);
          console.log(`   Function params: ${path.node.right?.params?.length || 0}`);
          console.log('');
        }
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugIsTopLevel();