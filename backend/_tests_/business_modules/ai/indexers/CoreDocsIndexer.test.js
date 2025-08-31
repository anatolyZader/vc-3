// Test for CoreDocsIndexer.js
const CoreDocsIndexer = require('../../../../business_modules/ai/infrastructure/ai/indexers/CoreDocsIndexer');

// Mock dependencies
const mockEmbeddings = { embed: jest.fn() };
const mockPinecone = { deleteMany: jest.fn() };
const mockDataPreparationPipeline = { processDocuments: jest.fn() };

describe('CoreDocsIndexer', () => {
  let indexer;

  beforeEach(() => {
    indexer = new CoreDocsIndexer(mockEmbeddings, mockPinecone, mockDataPreparationPipeline);
  });

  test('should initialize with required dependencies', () => {
    expect(indexer.embeddings).toBe(mockEmbeddings);
    expect(indexer.pinecone).toBe(mockPinecone);
    expect(indexer.dataPreparationPipeline).toBe(mockDataPreparationPipeline);
  });

  test('should have all required methods', () => {
    expect(typeof indexer.indexCoreDocsToPinecone).toBe('function');
    expect(typeof indexer.loadApiSpec).toBe('function');
    expect(typeof indexer.loadMarkdownFiles).toBe('function');
    expect(typeof indexer.chunkApiSpecEndpoints).toBe('function');
    expect(typeof indexer.chunkApiSpecSchemas).toBe('function');
    expect(typeof indexer.splitMarkdownDocuments).toBe('function');
  });
});
