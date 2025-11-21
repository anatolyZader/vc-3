const path = require('path');

describe('CodePreprocessor structural markers safety', () => {
  let CodePreprocessor;
  
  beforeAll(() => {
    const preprocessorPath = path.join(__dirname, '../../../../../../business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/codePreprocessor.js');
    CodePreprocessor = require(preprocessorPath);
  });

  test('does not add structural markers by default', async () => {
    const preprocessor = new CodePreprocessor();
    
    const testCode = `
function hello() {
  return 'world';
}

class TestClass {
  method() {
    return 42;
  }
}`;

    const result = await preprocessor.preprocessCodeFile(testCode, 'test.js', {});
    
    // Should not contain marker comments by default
    expect(result.content).not.toContain('=== FUNCTION BOUNDARY ===');
    expect(result.content).not.toContain('=== CLASS BOUNDARY ===');
    
    // Should preserve original code structure
    expect(result.content).toContain('function hello()');
    expect(result.content).toContain('class TestClass');
    
    // Should include safe structural information
    expect(result.structuralInfo).toBeDefined();
    expect(result.structuralInfo.functions).toHaveLength(1);
    expect(result.structuralInfo.classes).toHaveLength(1);
    expect(result.structuralInfo.functions[0].declaration).toContain('function hello()');
    expect(result.structuralInfo.classes[0].declaration).toContain('class TestClass');
  });

  test('adds structural markers only when explicitly requested', async () => {
    const preprocessor = new CodePreprocessor();
    
    const testCode = `
function hello() {
  return 'world';
}`;

    // Mock console.warn to check warning is displayed
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await preprocessor.preprocessCodeFile(testCode, 'test.js', {}, { 
      addStructuralMarkers: true 
    });
    
    // Should contain markers when explicitly requested
    expect(result.content).toContain('// [STRUCTURE]');
    expect(result.preprocessingApplied.structuralMarkers).toBe(true);
    
    // Should show warning
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('WARNING: Adding structural markers to code content - unsafe for execution/testing')
    );

    consoleSpy.mockRestore();
  });

  test('extractStructuralInfo provides safe analysis', async () => {
    const preprocessor = new CodePreprocessor();
    
    const complexCode = `
import React from 'react';
import { useState } from 'react';

class Component extends React.Component {
  render() {
    return <div>Hello</div>;
  }
}

function useHook() {
  return useState(0);
}

const arrowFunc = () => {
  return 'arrow';
};`;

    const structuralInfo = preprocessor.extractStructuralInfo(complexCode, 'jsx');
    
    expect(structuralInfo.classes).toHaveLength(1);
    expect(structuralInfo.functions).toHaveLength(2); // useHook, arrowFunc (render method not detected by current patterns)
    expect(structuralInfo.imports).toHaveLength(2);
    expect(structuralInfo.totalLines).toBeGreaterThan(10);
    expect(['low', 'medium', 'high']).toContain(structuralInfo.complexity);
  });
});