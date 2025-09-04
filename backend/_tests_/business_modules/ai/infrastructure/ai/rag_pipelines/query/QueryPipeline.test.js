const QueryPipeline = require('/home/runner/work/vc-3/vc-3/backend/business_modules/ai/infrastructure/ai/rag_pipelines/query/QueryPipeline');

describe('QueryPipeline Refactoring Integration', () => {
  test('should create QueryPipeline with modular architecture', () => {
    const options = {
      logLevel: 'DEBUG',
      enableEvents: false,
      searchTimeout: 15000
    };
    
    const pipeline = new QueryPipeline(options);
    
    // Verify the pipeline was created
    expect(pipeline).toBeDefined();
    expect(pipeline.logger).toBeDefined();
    expect(pipeline.vectorSearchManager).toBeDefined();
    expect(pipeline.contextAnalyzer).toBeDefined();
    expect(pipeline.responseManager).toBeDefined();
    expect(pipeline.eventManager).toBeDefined();
  });

  test('should handle missing dependencies gracefully', () => {
    expect(() => {
      new QueryPipeline({});
    }).not.toThrow();
  });

  test('should expose required public methods', () => {
    const pipeline = new QueryPipeline({});
    
    expect(typeof pipeline.respondToPrompt).toBe('function');
    expect(typeof pipeline.performIntelligentVectorSearch).toBe('function');
    expect(typeof pipeline.analyzeAndFormatContext).toBe('function');
    expect(typeof pipeline.generateLLMResponse).toBe('function');
    expect(typeof pipeline.generateResponseWithRetry).toBe('function');
    expect(typeof pipeline.generateStandardResponse).toBe('function');
    expect(typeof pipeline.emitRagStatus).toBe('function');
  });

  test('should validate vector database availability correctly', () => {
    const pipeline = new QueryPipeline({});
    
    expect(pipeline.isVectorDatabaseAvailable(null)).toBeFalsy();
    expect(pipeline.isVectorDatabaseAvailable({})).toBeFalsy();
    
    // Mock valid setup
    pipeline.pinecone = { mock: true };
    expect(pipeline.isVectorDatabaseAvailable({})).toBeTruthy();
  });

  test('should create proper result objects', () => {
    const pipeline = new QueryPipeline({});
    const conversationId = 'test-conv-123';
    
    const standardResult = pipeline.createStandardResponseResult(conversationId, 'test reason');
    expect(standardResult.success).toBe(true);
    expect(standardResult.useStandardResponse).toBe(true);
    expect(standardResult.reason).toBe('test reason');
    expect(standardResult.conversationId).toBe(conversationId);
    expect(standardResult.timestamp).toBeDefined();
    
    const errorResult = pipeline.createErrorResult(conversationId, new Error('test error'));
    expect(errorResult.success).toBe(false);
    expect(errorResult.error).toBe('test error');
    expect(errorResult.conversationId).toBe(conversationId);
  });
});