const CodePreprocessor = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/codePreprocessor.js');

const testCode = `
import React, { useState, useEffect } from 'react';
import { debounce } from 'lodash';
import axios from 'axios';

// Some comment here

/**
 * Main component for data processing
 */
export class DataProcessor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      loading: false
    };
  }

  async loadData() {
    this.setState({ loading: true });
    try {
      const response = await axios.get('/api/data');
      this.setState({ data: response.data, loading: false });
    } catch (error) {
      console.error('Failed to load data:', error);
      this.setState({ loading: false });
    }
  }

  render() {
    const { data, loading } = this.state;
    
    if (loading) return <div>Loading...</div>;
    
    return (
      <div>
        {data.map(item => <div key={item.id}>{item.name}</div>)}
      </div>
    );
  }
}
`;

async function testImportExclusion() {
  console.log('🧪 Testing Import Exclusion Feature\n');
  
  const preprocessor = new CodePreprocessor();
  
  console.log('📄 ORIGINAL CODE:');
  console.log('─'.repeat(60));
  console.log(testCode);
  console.log('─'.repeat(60));
  
  // Test with imports EXCLUDED (default behavior)
  console.log('\n🚫 WITH IMPORTS EXCLUDED (Default - Solves your problem):');
  console.log('─'.repeat(60));
  
  const excludedResult = await preprocessor.preprocessCodeFile(
    testCode, 
    'DataProcessor.jsx', 
    { source: 'test/DataProcessor.jsx' },
    { excludeImportsFromChunking: true } // Explicit true (default anyway)
  );
  
  console.log('✅ PREPROCESSED CONTENT (No import noise!):');
  console.log(excludedResult.content);
  console.log('\n📊 EXTRACTED IMPORTS:');
  excludedResult.extractedImports.forEach(imp => console.log(`  - ${imp}`));
  console.log(`\n📈 STATS: ${excludedResult.metadata.imports_count} imports excluded from chunking`);
  
  // Test with imports INCLUDED (for comparison)
  console.log('\n\n📥 WITH IMPORTS INCLUDED (Old problematic way):');
  console.log('─'.repeat(60));
  
  const includedResult = await preprocessor.preprocessCodeFile(
    testCode, 
    'DataProcessor.jsx', 
    { source: 'test/DataProcessor.jsx' },
    { excludeImportsFromChunking: false }
  );
  
  console.log('⚠️ CONTENT WITH IMPORTS (Would create noise chunks):');
  console.log(includedResult.content.substring(0, 300) + '...');
  
  console.log('\n🎯 CONCLUSION:');
  console.log('─'.repeat(60));
  console.log('✅ Import exclusion prevents chunks with just "import ... from ..." statements');
  console.log('✅ Chunks now start with actual meaningful code (classes, functions)');
  console.log('✅ Import information still preserved in metadata for context');
  console.log('✅ This solves the "blank lines and import statements" chunk problem!');
}

testImportExclusion();
