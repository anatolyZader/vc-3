const EnhancedASTCodeSplitter = require('./business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/processors/EnhancedASTCodeSplitter.js');

const testCode = `
// Complex React component with multiple functions
import React, { useState, useEffect } from 'react';
import { debounce } from 'lodash';

/**
 * A sophisticated data processing component
 * that demonstrates various TypeScript patterns
 */
export class DataProcessor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      loading: false,
      error: null
    };
  }

  async componentDidMount() {
    await this.loadInitialData();
  }

  async loadInitialData() {
    this.setState({ loading: true });
    try {
      const response = await fetch('/api/data');
      const data = await response.json();
      this.setState({ data, loading: false });
    } catch (error) {
      this.setState({ error: error.message, loading: false });
    }
  }

  handleDataUpdate = debounce((newData) => {
    this.setState({ data: newData });
  }, 300);

  processData(rawData) {
    return rawData
      .filter(item => item.isValid)
      .map(item => ({
        ...item,
        processed: true,
        timestamp: Date.now()
      }))
      .sort((a, b) => a.priority - b.priority);
  }

  render() {
    const { data, loading, error } = this.state;
    
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    
    return (
      <div className="data-processor">
        {this.processData(data).map(item => (
          <div key={item.id} className="data-item">
            {item.title}
          </div>
        ))}
      </div>
    );
  }
}

export function useDataProcessor() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/data');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return { data, loading, loadData };
}

const utilityFunctions = {
  formatDate: (date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  },

  validateEmail: (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  generateId: () => {
    return Math.random().toString(36).substr(2, 9);
  }
};

export default DataProcessor;
`;

async function testTokenBasedSplitting() {
  console.log('🧪 Testing Token-Based Splitting Implementation\n');
  
  const splitter = new EnhancedASTCodeSplitter({
    maxTokens: 500,        // Small tokens for testing
    overlapTokens: 50,     // Small overlap for testing
    qualityThreshold: 0.7
  });

  const metadata = {
    source: 'test_react_component.jsx',
    type: 'react_component'
  };

  try {
    console.log('📊 Original Code Analysis:');
    console.log(`- Characters: ${testCode.length}`);
    console.log(`- Lines: ${testCode.split('\n').length}`);
    console.log(`- Tokens: ${splitter.tokenSplitter.countTokens(testCode)}\n`);

    const chunks = await splitter.splitDocuments([{
      pageContent: testCode,
      metadata
    }]);

    console.log(`✅ Splitting Results: ${chunks.length} chunks\n`);

    chunks.forEach((chunk, index) => {
      const tokens = splitter.tokenSplitter.countTokens(chunk.pageContent);
      const chars = chunk.pageContent.length;
      
      console.log(`📦 Chunk ${index + 1}:`);
      console.log(`   - Tokens: ${tokens}`);
      console.log(`   - Characters: ${chars}`);
      console.log(`   - Split Method: ${chunk.metadata.split_method}`);
      console.log(`   - Token Efficiency: ${chunk.metadata.token_efficiency || 'N/A'}`);
      console.log(`   - Preview: ${chunk.pageContent.substring(0, 100).replace(/\n/g, '\\n')}...\n`);
    });

    // Verify token limits
    const oversizedChunks = chunks.filter(chunk => 
      splitter.tokenSplitter.countTokens(chunk.pageContent) > splitter.tokenSplitter.maxTokens
    );
    
    if (oversizedChunks.length > 0) {
      console.log(`⚠️ WARNING: ${oversizedChunks.length} chunks exceed token limit!`);
    } else {
      console.log('✅ All chunks are within token limits');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testTokenBasedSplitting();
