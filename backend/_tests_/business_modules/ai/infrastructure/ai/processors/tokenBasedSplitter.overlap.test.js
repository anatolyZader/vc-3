const path = require('path');

describe('TokenBasedSplitter overlap accuracy', () => {
  let TokenBasedSplitter;
  beforeAll(() => {
    const splitterPath = path.join(__dirname, '../../../../../../business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/tokenBasedSplitter.js');
    TokenBasedSplitter = require(splitterPath);
  });

  test('extractOverlapText produces exact token count when encoding available', () => {
    const splitter = new TokenBasedSplitter({ maxTokens: 100, overlapTokens: 5, minTokens: 5 });
    
    // Test with a known text
    const testText = 'The quick brown fox jumps over the lazy dog. This is a test sentence for overlap.';
    const overlapResult = splitter.extractOverlapText(testText, 5);
    
    // Verify the overlap has exactly the requested token count (or less)
    const overlapTokens = splitter.countTokens(overlapResult);
    expect(overlapTokens).toBeLessThanOrEqual(5);
    expect(overlapTokens).toBeGreaterThan(0);
    
    // Verify it's actually a suffix of the original text
    expect(testText.endsWith(overlapResult)).toBe(true);
  });

  test('extractOverlapText handles edge cases properly', () => {
    const splitter = new TokenBasedSplitter({ maxTokens: 100, overlapTokens: 10, minTokens: 5 });
    
    // Test with short text (should return whole text)
    const shortText = 'Short text';
    const shortOverlap = splitter.extractOverlapText(shortText, 20);
    expect(shortOverlap).toBe(shortText);
    
    // Test with zero overlap
    const zeroOverlap = splitter.extractOverlapText('Any text here', 0);
    expect(zeroOverlap).toBe('');
    
    // Test with empty text
    const emptyOverlap = splitter.extractOverlapText('', 5);
    expect(emptyOverlap).toBe('');
  });

  test('fallback word-based overlap respects token limits', () => {
    const splitter = new TokenBasedSplitter({ maxTokens: 100, overlapTokens: 8, minTokens: 5 });
    const originalEncoding = splitter.encoding;
    
    try {
      // Temporarily disable encoding to force fallback
      splitter.encoding = null;
      
      const text = 'Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu';
      const overlap = splitter.extractOverlapText(text, 8);
      
      // Restore encoding to count tokens
      splitter.encoding = originalEncoding;
      const overlapTokens = splitter.countTokens(overlap);
      
      expect(overlapTokens).toBeLessThanOrEqual(8);
      expect(text.endsWith(overlap)).toBe(true);
    } finally {
      // Ensure encoding is restored
      splitter.encoding = originalEncoding;
    }
  });
});
